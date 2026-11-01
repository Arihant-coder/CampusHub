"""Temporary per-user, per-subject study materials.

PDF bytes are uploaded to Gemini Files API; TXT/MD content is kept in this
process's memory. Nothing in this module writes uploaded materials to Supabase
or the local filesystem. The in-memory registry is intentionally reset when
this backend process restarts.
"""

from __future__ import annotations

import io
import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import RLock
from typing import Any, Literal

from fastapi import HTTPException
from supabase import Client, create_client

from core.config import settings
from .service import get_client

logger = logging.getLogger(__name__)

MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_MATERIALS_PER_SUBJECT = 5
MAX_TEXT_CHARS = 40_000
MAX_TOTAL_TEXT_CHARS = 80_000
PDF_REFERENCE_LIFETIME = timedelta(hours=47)  # expire locally before Google's 48-hour limit


@dataclass
class StoredStudyMaterial:
    id: str
    owner_id: str
    subject_id: str
    title: str
    kind: Literal["pdf", "text"]
    mime_type: str
    size_bytes: int
    created_at: str
    text: str | None = None
    gemini_file_name: str | None = None
    gemini_file_uri: str | None = None
    expires_at: datetime | None = None


# Process-local memory only: deliberately not Redis, disk, or Supabase Storage.
_materials: dict[str, StoredStudyMaterial] = {}
_lock = RLock()
MATERIALS_TABLE = "subject_ai_study_materials"


def _database(user: dict[str, Any]) -> Client | None:
    """Create an RLS-scoped client from the JWT verified by get_current_user."""
    access_token = user.get("_access_token")
    if not access_token:
        # Explicit local mock tokens have no Supabase session; keep their
        # materials isolated in process memory for development.
        return None
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(str(access_token))
    return client


def _row_to_material(row: dict[str, Any]) -> StoredStudyMaterial:
    expires_at = row.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    return StoredStudyMaterial(
        id=str(row["id"]),
        owner_id=str(row["user_id"]),
        subject_id=str(row["subject_id"]),
        title=str(row["title"]),
        kind=row["kind"],
        mime_type=str(row["mime_type"]),
        size_bytes=int(row["size_bytes"]),
        created_at=str(row["created_at"]),
        text=row.get("text_content"),
        gemini_file_name=row.get("gemini_file_name"),
        gemini_file_uri=row.get("gemini_file_uri"),
        expires_at=expires_at,
    )


def _get_database_materials(client: Client, subject_id: str) -> list[StoredStudyMaterial]:
    try:
        rows = (
            client.table(MATERIALS_TABLE)
            .select("*")
            .eq("subject_id", subject_id)
            .order("created_at")
            .execute()
            .data
        )
        return [_row_to_material(row) for row in rows]
    except Exception as exc:
        logger.exception("Failed to list study materials from Supabase")
        raise HTTPException(status_code=503, detail="Could not access study materials. Please try again.") from exc


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _owner_id(user: dict[str, Any]) -> str:
    value = user.get("id") or user.get("sub")
    if not value:
        raise HTTPException(status_code=401, detail="Unable to identify the current user.")
    return str(value)


def _prune_expired() -> None:
    """Remove expired PDF references from the app registry.

    Google also expires Files API uploads after 48 hours. We hide them slightly
    earlier so the UI won't keep offering a reference likely to have expired.
    """
    now = _now()
    with _lock:
        expired_ids = [
            material_id
            for material_id, material in _materials.items()
            if material.expires_at is not None and material.expires_at <= now
        ]
        for material_id in expired_ids:
            _materials.pop(material_id, None)


def _subject_items(owner_id: str, subject_id: str) -> list[StoredStudyMaterial]:
    return [
        material
        for material in _materials.values()
        if material.owner_id == owner_id and material.subject_id == subject_id
    ]


def _public(material: StoredStudyMaterial) -> dict[str, Any]:
    # Never return Gemini URIs, provider file names, or the stored text to the browser.
    return {
        "id": material.id,
        "title": material.title,
        "kind": material.kind,
        "mime_type": material.mime_type,
        "size_bytes": material.size_bytes,
        "created_at": material.created_at,
    }


def list_study_materials(user: dict[str, Any], subject_id: str) -> list[dict[str, Any]]:
    _prune_expired()
    owner_id = _owner_id(user)
    with _lock:
        items = _subject_items(owner_id, subject_id)
        items.sort(key=lambda item: item.created_at)
        return [_public(item) for item in items]


def clear_study_materials(user: dict[str, Any], subject_id: str) -> None:
    """Clear this user's temporary uploads for a subject and legacy records."""
    owner_id = _owner_id(user)
    removed: dict[str, StoredStudyMaterial] = {}

    with _lock:
        for material_id, material in list(_materials.items()):
            if material.owner_id == owner_id and material.subject_id == subject_id:
                removed[material_id] = _materials.pop(material_id)

    # Remove rows created by older versions that persisted uploads in Supabase.
    client = _database(user)
    if client:
        database_items = _get_database_materials(client, subject_id)
        for material in database_items:
            removed.setdefault(material.id, material)
        if database_items:
            try:
                client.table(MATERIALS_TABLE).delete().eq(
                    "subject_id", subject_id
                ).execute()
            except Exception as exc:
                logger.exception("Failed to clear legacy study material records")
                raise HTTPException(
                    status_code=503,
                    detail="Could not clear previous study materials. Please try again.",
                ) from exc

    for material in removed.values():
        if material.gemini_file_name:
            try:
                get_client().files.delete(name=material.gemini_file_name)
            except Exception:
                # Gemini expires uploaded files automatically after 48 hours.
                logger.warning(
                    "Could not delete cleared Gemini file %s",
                    material.gemini_file_name,
                    exc_info=True,
                )


def upload_study_material(
    user: dict[str, Any],
    subject_id: str,
    filename: str,
    content_type: str | None,
    raw: bytes,
) -> dict[str, Any]:
    if not subject_id or len(subject_id) > 50:
        raise HTTPException(status_code=422, detail="A valid subject ID is required.")

    title = Path((filename or "study-material").replace("\\", "/")).name.strip()
    extension = Path(title).suffix.lower()
    if extension not in {".pdf", ".txt", ".md"}:
        raise HTTPException(status_code=415, detail="Only PDF, TXT and MD files are supported.")
    if not raw:
        raise HTTPException(status_code=400, detail="The selected file is empty.")
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="The maximum file size is 20 MB.")

    _prune_expired()
    owner_id = _owner_id(user)
    with _lock:
        current = _subject_items(owner_id, subject_id)
    if current:
        if len(current) >= MAX_MATERIALS_PER_SUBJECT:
            raise HTTPException(
                status_code=409,
                detail=f"You can attach up to {MAX_MATERIALS_PER_SUBJECT} files to one subject.",
            )
    current_text_chars = sum(len(item.text or "") for item in current)

    created_at = _now()
    material_id = secrets.token_urlsafe(18)

    if extension == ".pdf":
        if b"%PDF-" not in raw[:1024]:
            raise HTTPException(status_code=400, detail="This file does not look like a valid PDF.")

        stream = io.BytesIO(raw)
        stream.name = title  # the SDK may inspect the file name when uploading
        try:
            uploaded = get_client().files.upload(
                file=stream,
                config={"mime_type": "application/pdf"},
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Gemini Files API upload failed for %s", title)
            raise HTTPException(
                status_code=502,
                detail="Gemini could not upload this PDF. Check the API key, file and model project, then try again.",
            )

        if not getattr(uploaded, "uri", None) or not getattr(uploaded, "name", None):
            raise HTTPException(status_code=502, detail="Gemini did not return a usable file reference.")

        material = StoredStudyMaterial(
            id=material_id,
            owner_id=owner_id,
            subject_id=subject_id,
            title=title,
            kind="pdf",
            mime_type="application/pdf",
            size_bytes=len(raw),
            created_at=created_at.isoformat(),
            gemini_file_name=uploaded.name,
            gemini_file_uri=uploaded.uri,
            expires_at=created_at + PDF_REFERENCE_LIFETIME,
        )
    else:
        try:
            text = raw.decode("utf-8-sig").strip()
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="TXT and MD files must be UTF-8 text.")
        if not text:
            raise HTTPException(status_code=400, detail="The selected text file is empty.")
        if len(text) > MAX_TEXT_CHARS:
            raise HTTPException(
                status_code=413,
                detail=f"Text files are limited to {MAX_TEXT_CHARS:,} characters each.",
            )
        if current_text_chars + len(text) > MAX_TOTAL_TEXT_CHARS:
            raise HTTPException(
                status_code=413,
                detail=f"Text materials for one subject are limited to {MAX_TOTAL_TEXT_CHARS:,} characters total.",
            )

        mime_type = "text/markdown" if extension == ".md" else "text/plain"
        material = StoredStudyMaterial(
            id=material_id,
            owner_id=owner_id,
            subject_id=subject_id,
            title=title,
            kind="text",
            mime_type=mime_type,
            size_bytes=len(raw),
            created_at=created_at.isoformat(),
            text=text,
        )

    # Recheck the cap under lock in case two uploads completed concurrently.
    with _lock:
        current = _subject_items(owner_id, subject_id)
        if len(current) >= MAX_MATERIALS_PER_SUBJECT:
            if material.gemini_file_name:
                try:
                    get_client().files.delete(name=material.gemini_file_name)
                except Exception:
                    logger.warning("Could not clean up over-limit Gemini file %s", material.gemini_file_name)
            raise HTTPException(
                status_code=409,
                detail=f"You can attach up to {MAX_MATERIALS_PER_SUBJECT} files to one subject.",
            )
        _materials[material.id] = material

    return _public(material)


def get_owned_study_materials(
    user: dict[str, Any], subject_id: str, material_ids: list[str]
) -> list[StoredStudyMaterial]:
    """Resolve selected IDs safely for the later chat/flashcard/quiz endpoints."""
    _prune_expired()
    owner_id = _owner_id(user)
    with _lock:
        resolved: list[StoredStudyMaterial] = []
        for material_id in material_ids:
            material = _materials.get(material_id)
            if material is None or material.owner_id != owner_id or material.subject_id != subject_id:
                raise HTTPException(
                    status_code=404,
                    detail="One of the selected study materials has expired or is unavailable. Upload it again.",
                )
            resolved.append(material)
        return resolved


def remove_study_material(user: dict[str, Any], subject_id: str, material_id: str) -> None:
    owner_id = _owner_id(user)
    with _lock:
        material = _materials.get(material_id)
        if (
            material is None
            or material.owner_id != owner_id
            or material.subject_id != subject_id
        ):
            raise HTTPException(status_code=404, detail="Study material not found or expired.")
        _materials.pop(material_id, None)

    if material.gemini_file_name:
        try:
            get_client().files.delete(name=material.gemini_file_name)
        except Exception:
            # The registry is already cleared. Gemini's own 48-hour expiry remains a backstop.
            logger.warning("Could not delete Gemini file %s", material.gemini_file_name, exc_info=True)
