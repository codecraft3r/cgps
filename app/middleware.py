from typing import Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, SecurityScopes
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils import VerifyToken, check_scope, UnauthorizedException, UnauthenticatedException

class CheckKeyScopeMiddleware(BaseHTTPMiddleware):
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
