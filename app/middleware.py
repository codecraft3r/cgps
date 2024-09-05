from typing import Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, SecurityScopes
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils import VerifyToken, check_scope, UnauthorizedException, UnauthenticatedException
from typing import Any, Optional
import unkey

class Auth0ScopedMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, required_scopes: list[str]):
        super().__init__(app)
        self.required_scopes = required_scopes
        self.auth = VerifyToken()
        self.bearer = HTTPBearer()

    async def dispatch(self, request: Request, call_next):
        try:
            # Extract and verify the token
            credentials: HTTPAuthorizationCredentials = await self.bearer(request)
            payload = await self.auth.verify(SecurityScopes(scopes=self.required_scopes), credentials)
            check_scope(payload, self.required_scopes)
        except (UnauthorizedException, UnauthenticatedException, HTTPException) as e:
            # Return appropriate error response for authentication/authorization failures
            return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
        except Exception as e:
            # Log unexpected errors and return a generic error response
            # Consider logging the error here
            return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

        # Proceed with the request if authentication and authorization succeed
        response = await call_next(request)
        return response


def key_extractor(*args: Any, **kwargs: Any) -> Optional[str]:
    if isinstance(auth := kwargs.get("authorization"), str):
        return auth.split(" ")[-1]
    return None

class UnkeyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, unkey_api_id: str, unkey_api_key: str):
        super().__init__(app)
        self.unkey_api_id = unkey_api_id
        self.unkey_client = unkey.Client(unkey_api_key)

    async def dispatch(self, request: Request, call_next):
        authorization: str = request.headers.get("authorization")
        key = key_extractor(authorization=authorization)
        if not key:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

        try:
            await self.unkey_client.start()
            unkey_verification = await self.unkey_client.keys.verify_key(key=key, api_id=self.unkey_api_id)
            await self.unkey_client.close()
            if not unkey_verification.is_ok:
                return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
            unkey_verification = unkey_verification.unwrap()
            if not unkey_verification.valid:
                return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        except Exception as e:
            print(e)
            return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

        # Attach unkey_verification to request state for access in routes
        request.state.unkey_verification = unkey_verification
        request.state.owner_id = unkey_verification.owner_id

        response = await call_next(request)
        return response
