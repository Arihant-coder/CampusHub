from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from core.rate_limit import rate_limit
from core.security import get_current_user
from .materials import (
    MAX_FILE_BYTES,
    clear_study_materials,
    get_owned_study_materials,
    list_study_materials,
    remove_study_material,
    upload_study_material,
)
from .schemas import ChatRequest, ChatResponse
from .service import generate_reply, stream_reply
from .study_tools import (
    GenerateFlashcardsRequest,
    GenerateFlashcardsResponse,
    generate_flashcards,
)
from .study_tools import (
    GenerateFlashcardsRequest,
    GenerateFlashcardsResponse,
    generate_flashcards,
    GenerateQuizRequest,
    GenerateQuizResponse,
    generate_quiz,
)

router = APIRouter(
    tags=["subjects-ai"],
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    materials = get_owned_study_materials(current_user, req.subject_id, req.material_ids)
    reply = generate_reply(
        req.subject_id,
        req.messages,
        req.documents,
        materials,
        subject_name=req.subject_name,
    )
    return ChatResponse(reply=reply)


@router.post("/chat/stream")
def chat_stream(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    materials = get_owned_study_materials(current_user, req.subject_id, req.material_ids)
    return StreamingResponse(
        stream_reply(
            req.subject_id,
            req.messages,
            req.documents,
            materials,
            subject_name=req.subject_name,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/materials")
def get_materials(
    subject_id: str = Query(min_length=1, max_length=50),
    current_user: dict = Depends(get_current_user),
):
    """List this user's unexpired materials for one subject from process memory."""
    return list_study_materials(current_user, subject_id)


@router.delete("/materials")
def clear_materials(
    subject_id: str = Query(min_length=1, max_length=50),
    current_user: dict = Depends(get_current_user),
):
    """Clear temporary uploads and remove legacy persisted references."""
    clear_study_materials(current_user, subject_id)
    return {"cleared": True}


@router.post("/materials")
def add_material(
    subject_id: str = Form(..., min_length=1, max_length=50),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a PDF to Gemini Files API or retain TXT/MD content in RAM."""
    filename = file.filename or ""
    raw = file.file.read(MAX_FILE_BYTES + 1)
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="The maximum file size is 20 MB.")
    return upload_study_material(
        current_user,
        subject_id,
        filename,
        file.content_type,
        raw,
    )


@router.delete("/materials/{material_id}")
def delete_material(
    material_id: str,
    subject_id: str = Query(min_length=1, max_length=50),
    current_user: dict = Depends(get_current_user),
):
    """Remove a material from this session and delete its Gemini copy when possible."""
    remove_study_material(current_user, subject_id, material_id)
    return {"deleted": True}

@router.post(
    "/flashcards/generate",
    response_model=GenerateFlashcardsResponse,
)
def create_flashcards(
    request: GenerateFlashcardsRequest,
    current_user: dict = Depends(get_current_user),
):
    return generate_flashcards(current_user, request)

@router.post(
    "/quiz/generate",
    response_model=GenerateQuizResponse,
)
def create_quiz(
    request: GenerateQuizRequest,
    current_user: dict = Depends(get_current_user),
):
    return generate_quiz(current_user, request)
