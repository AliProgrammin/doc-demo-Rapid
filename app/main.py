import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.logging import configure_logging
from app.db.session import Base, engine
from app.routers.upload import router as upload_router
from app.routers.extract import router as extract_router
from app.routers.reconcile import router as reconcile_router
from app.routers.documents import router as documents_router
from app.routers.extraction_runs import router as extraction_runs_router
from app.routers.transactions import router as transactions_router
from app.routers.invoices import router as invoices_router

configure_logging()
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="doc-demo-backend-variant")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"success": False, "detail": "Internal server error"})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    return {"status": "ready"}


app.include_router(upload_router)
app.include_router(extract_router)
app.include_router(reconcile_router)
app.include_router(documents_router)
app.include_router(extraction_runs_router)
app.include_router(transactions_router)
app.include_router(invoices_router)
