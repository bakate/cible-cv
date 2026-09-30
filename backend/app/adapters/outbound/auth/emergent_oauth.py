"""Emergent managed Google OAuth — implements OAuthProvider."""
import requests

from app.domain.models import OAuthProfile

EMERGENT_AUTH_BASE = "https://demobackend.emergentagent.com/auth/v1/env"


class EmergentOAuthProvider:
    def __init__(self, base_url: str = EMERGENT_AUTH_BASE, timeout: int = 10):
        self.base_url, self.timeout = base_url, timeout

    def fetch_profile(self, session_id: str) -> OAuthProfile:
        r = requests.get(
            f"{self.base_url}/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=self.timeout,
        )
        r.raise_for_status()
        return OAuthProfile.model_validate(r.json())
