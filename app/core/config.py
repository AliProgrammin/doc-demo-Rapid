from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "doc-demo-backend-variant"
    db_url: str = "sqlite:///./app.db"
    storage_dir: str = "./storage"


settings = Settings()
