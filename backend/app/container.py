"""Composition root: reads settings, instantiates adapters and wires use cases."""
import os
from dataclasses import dataclass
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

from app.adapters.outbound.auth.emergent_oauth import EmergentOAuthProvider
from app.adapters.outbound.llm.claude import ClaudeLlmAdapter
from app.adapters.outbound.mongo.repositories import (
    MongoBaseProfileRepository,
    MongoGenerationRepository,
    MongoSessionRepository,
    MongoUserRepository,
)
from app.adapters.outbound.parsing.extractors import (
    FileTextExtractor,
    RequestsWebPageFetcher,
)
from app.adapters.outbound.rendering.renderer import OfficeDocumentRenderer
from app.adapters.outbound.system import SystemClock, UuidGenerator
from app.application.use_cases.analysis import AtsCheck, RegroupSkills
from app.application.use_cases.auth import (
    AuthenticateSession,
    Logout,
    ProcessOAuthSession,
)
from app.application.use_cases.exports import ExportDocument
from app.application.use_cases.generation import (
    DeleteGeneration,
    GenerateDocuments,
    GetGeneration,
    ListGenerations,
    UpdateGeneration,
)
from app.application.use_cases.parsing import ExtractDocumentText, ExtractUrlText
from app.application.use_cases.profile import (
    DeleteBaseProfile,
    GetBaseProfile,
    SaveBaseProfile,
)


@dataclass(frozen=True)
class Settings:
    mongo_url: str
    db_name: str
    llm_key: str
    admin_email: str
    cors_origins: str
    fonts_dir: Path

    @classmethod
    def from_env(cls, root: Path) -> "Settings":
        return cls(
            mongo_url=os.environ["MONGO_URL"],
            db_name=os.environ["DB_NAME"],
            llm_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            admin_email=os.environ.get("ADMIN_EMAIL", ""),
            cors_origins=os.environ.get("CORS_ORIGINS", "").strip(),
            fonts_dir=root / "fonts",
        )


@dataclass
class Container:
    settings: Settings
    mongo_client: AsyncIOMotorClient
    process_oauth_session: ProcessOAuthSession
    authenticate_session: AuthenticateSession
    logout: Logout
    extract_document_text: ExtractDocumentText
    extract_url_text: ExtractUrlText
    generate_documents: GenerateDocuments
    list_generations: ListGenerations
    get_generation: GetGeneration
    update_generation: UpdateGeneration
    delete_generation: DeleteGeneration
    export_document: ExportDocument
    get_base_profile: GetBaseProfile
    save_base_profile: SaveBaseProfile
    delete_base_profile: DeleteBaseProfile
    regroup_skills: RegroupSkills
    ats_check: AtsCheck

    def close(self) -> None:
        self.mongo_client.close()


def build_container(settings: Settings) -> Container:
    client = AsyncIOMotorClient(settings.mongo_url)
    db = client[settings.db_name]

    users = MongoUserRepository(db)
    sessions = MongoSessionRepository(db)
    generations = MongoGenerationRepository(db)
    base_profiles = MongoBaseProfileRepository(db)
    llm = ClaudeLlmAdapter(settings.llm_key)
    renderer = OfficeDocumentRenderer(settings.fonts_dir)
    clock, ids = SystemClock(), UuidGenerator()

    return Container(
        settings=settings,
        mongo_client=client,
        process_oauth_session=ProcessOAuthSession(
            EmergentOAuthProvider(), users, sessions, generations, base_profiles, clock, ids, settings.admin_email
        ),
        authenticate_session=AuthenticateSession(sessions, users, clock),
        logout=Logout(sessions),
        extract_document_text=ExtractDocumentText(FileTextExtractor()),
        extract_url_text=ExtractUrlText(RequestsWebPageFetcher()),
        generate_documents=GenerateDocuments(llm, generations, clock, ids),
        list_generations=ListGenerations(generations),
        get_generation=GetGeneration(generations),
        update_generation=UpdateGeneration(generations),
        delete_generation=DeleteGeneration(generations),
        export_document=ExportDocument(generations, renderer),
        get_base_profile=GetBaseProfile(base_profiles),
        save_base_profile=SaveBaseProfile(base_profiles, clock),
        delete_base_profile=DeleteBaseProfile(base_profiles),
        regroup_skills=RegroupSkills(llm),
        ats_check=AtsCheck(llm, generations),
    )
