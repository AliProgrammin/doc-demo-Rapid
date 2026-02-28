import os
import shutil
import uuid
from fastapi import UploadFile

from app.core.config import settings


def ensure_storage() -> None:
    os.makedirs(settings.storage_dir, exist_ok=True)


def save_upload(file: UploadFile) -> tuple[str, str]:
    ensure_storage()
    blob_name = f"{uuid.uuid4()}-{file.filename}"
    path = os.path.join(settings.storage_dir, blob_name)
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)
    return blob_name, path
