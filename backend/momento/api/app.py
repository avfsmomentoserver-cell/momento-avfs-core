"""FastAPI application factory."""

from __future__ import annotations

import asyncio
import logging
import logging.handlers
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .. import __version__, auth, config, db, plugins
from ..feed import autostart_if_configured, feed
from ..hub import hub
from ..watcher import watcher
from .routes import analysis as analysis_routes
from .routes import backtest as backtest_routes
from .routes import backtest_enhanced as backtest_enhanced_routes
from .routes import core as core_routes
from .routes import engines as engines_routes
from .routes import features as features_routes
from .routes import forecasts as forecast_routes
from .routes import ingest as ingest_routes
from .routes import market as market_routes
from .routes import mega_pressure as mega_pressure_routes
from .routes import platform as platform_routes
from .routes import rounds as rounds_routes
from .routes import users as users_routes
from .routes import vocabulary as vocabulary_routes
from .routes import ws as ws_routes

logger = logging.getLogger("momento")

API_PREFIX = "/api/v1"


def configure_logging() -> None:
    """Console + rotating file logging into `logs/api.log`."""
    config.ensure_directories()
    root = logging.getLogger()
    if root.handlers:
        return

    root.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)-7s %(name)s :: %(message)s")

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    root.addHandler(console)

    try:
        file_handler = logging.handlers.RotatingFileHandler(
            config.LOG_DIR / "api.log", maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)
    except OSError as exc:
        logger.warning("file logging unavailable: %s", exc)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Boot every subsystem, then tear it down cleanly."""
    configure_logging()
    logger.info("Momento Core %s starting", __version__)

    db.init_db()
    auth.bootstrap()
    hub.bind_loop(asyncio.get_running_loop())

    if config.WATCHER_ENABLED:
        watcher.start()

    await autostart_if_configured()
    logger.info("Momento Core ready on %s:%s", config.API_HOST, config.API_PORT)

    try:
        yield
    finally:
        logger.info("Momento Core shutting down")
        try:
            await feed.stop()
        except Exception as exc:
            logger.debug("feed shutdown: %s", exc)
        watcher.stop()


def create_app() -> FastAPI:
    application = FastAPI(
        title="Momento Core / AVFS API",
        description=(
            "Modular analytics and forecasting platform. "
            "Pipeline: Collector -> Ingest API -> Analysis -> Forecast Engine -> Database -> Dashboard."
        ),
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if config.ALLOW_ALL_CORS else config.CORS_ORIGINS,
        allow_credentials=not config.ALLOW_ALL_CORS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        """Sanitised error envelope — internals never reach the client."""
        logger.exception("unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "path": request.url.path,
                "timestamp": db.utc_now(),
            },
        )

    for module in (
        core_routes,
        rounds_routes,
        analysis_routes,
        market_routes,
        forecast_routes,
        engines_routes,
        ingest_routes,
        users_routes,
        platform_routes,
        backtest_routes,
        features_routes,
        backtest_enhanced_routes,
        vocabulary_routes,
        mega_pressure_routes,
    ):
        application.include_router(module.router, prefix=API_PREFIX)

    application.include_router(ws_routes.router)

    # Convenience aliases matching the legacy documented surface.
    @application.get("/health", include_in_schema=False)
    async def legacy_health() -> Dict[str, Any]:
        return await core_routes.health()

    @application.get("/", include_in_schema=False)
    async def root() -> Dict[str, Any]:
        return {
            "platform": "Momento Core / AVFS",
            "version": __version__,
            "api": API_PREFIX,
            "docs": "/docs",
            "websocket": "/ws",
            "health": f"{API_PREFIX}/health",
        }

    return application


app = create_app()
