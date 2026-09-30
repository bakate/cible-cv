"""Cible CV — FastAPI entrypoint (inbound HTTP adapter + composition root)."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from app.adapters.inbound.http.errors import register_error_handlers
from app.adapters.inbound.http.routes import router
from app.container import Settings, build_container

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

settings = Settings.from_env(ROOT_DIR)


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.container = build_container(settings)
    yield
    application.state.container.close()


app = FastAPI(title="Cible CV API", lifespan=lifespan)
register_error_handlers(app)
app.include_router(router)

if settings.cors_origins and settings.cors_origins != "*":
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origin_regex=".*",
        allow_methods=["*"],
        allow_headers=["*"],
    )
