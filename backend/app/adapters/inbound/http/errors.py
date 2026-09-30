"""Map domain errors to HTTP responses."""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.domain.errors import (
    AuthenticationError,
    ConfigurationError,
    DomainError,
    ForbiddenError,
    NotFoundError,
    UpstreamError,
    ValidationError,
)

STATUS_BY_ERROR = {
    ValidationError: 400,
    AuthenticationError: 401,
    ForbiddenError: 403,
    NotFoundError: 404,
    ConfigurationError: 500,
    UpstreamError: 502,
}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain_error(_: Request, exc: DomainError) -> JSONResponse:
        status = next((code for cls, code in STATUS_BY_ERROR.items() if isinstance(exc, cls)), 500)
        return JSONResponse(status_code=status, content={"detail": exc.message})
