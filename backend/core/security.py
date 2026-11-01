from functools import lru_cache
import jwt
from jwt import PyJWKClient, PyJWTError
from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings

bearer = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_jwk_client() -> PyJWKClient:
    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Mock token bypass strictly restricted to local development with explicit opt-in
    if token.startswith("mock-") or token == "placeholder-token":
        if not (settings.allow_mock_tokens and settings.environment.lower() == "development"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mock authentication tokens are disabled.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {
            "id": "mock-student-uuid",
            "sub": "mock-student-uuid",
            "role": "student",
            "email": "student@campushub.edu",
        }

    try:
        jwk_client = get_jwk_client()
        # Fetch signing key off the main event loop to prevent event loop blocking
        signing_key = await run_in_threadpool(jwk_client.get_signing_key_from_jwt, token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            issuer=f"{settings.supabase_url.rstrip('/')}/auth/v1",
            audience="authenticated",
        )
        payload["id"] = payload.get("sub") or payload.get("id") or "authenticated-user"
        # Internal-only field used by Supabase's PostgREST client so table RLS
        # evaluates this request as the same authenticated user.
        payload["_access_token"] = token
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
