"""Claude (Anthropic) via emergentintegrations — implements LlmPort."""
import uuid

from emergentintegrations.llm.chat import LlmChat, UserMessage

from app.domain.errors import ConfigurationError

ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929"


class ClaudeLlmAdapter:
    def __init__(self, api_key: str, model: str = ANTHROPIC_MODEL, max_tokens: int = 8000):
        self.api_key, self.model, self.max_tokens = api_key, model, max_tokens

    async def complete(self, system_prompt: str, user_text: str) -> str:
        if not self.api_key:
            raise ConfigurationError("EMERGENT_LLM_KEY non configurée")
        chat = (
            LlmChat(api_key=self.api_key, session_id=f"cible-cv-{uuid.uuid4()}", system_message=system_prompt)
            .with_model("anthropic", self.model)
            .with_params(max_tokens=self.max_tokens)
        )
        response = await chat.send_message(UserMessage(text=user_text))
        return response if isinstance(response, str) else str(response)
