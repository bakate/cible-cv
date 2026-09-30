"""Domain errors — framework-agnostic. Mapped to HTTP by the inbound adapter."""


class DomainError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ValidationError(DomainError):
    pass


class NotFoundError(DomainError):
    pass


class AuthenticationError(DomainError):
    pass


class ForbiddenError(DomainError):
    pass


class UpstreamError(DomainError):
    pass


class ConfigurationError(DomainError):
    pass
