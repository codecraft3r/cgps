from fastapi import FastAPI, APIRouter

from app.utils import VerifyToken
from app.mongo import initialize_db

from app.middleware import CheckKeyScopeMiddleware, UnkeyMiddleware

from app.routes.users import user_api_router
from app.routes.models import models_api_router
from app.routes.chat import chat_api_router
from app.routes.projects.chat import project_chat_api_router
from app.routes.projects.models import models_api_router as project_models_api_router
from app.config import get_settings

core_app = FastAPI(root_path="/v1", docs_url="/docs", redoc_url="/redoc")
core_app.add_middleware(
    CheckKeyScopeMiddleware,
    required_scopes=["key_type:core"]
)

projects_app = FastAPI(root_path="/projects/v1", docs_url="/docs", redoc_url="/redoc")
projects_app.add_middleware(
    UnkeyMiddleware,
    unkey_api_id=get_settings().unkey_api_id,
    unkey_api_key=get_settings().unkey_api_key
)
projects_app.include_router(project_chat_api_router)
projects_app.include_router(project_models_api_router)

auth = VerifyToken()

core_app.include_router(chat_api_router)
core_app.include_router(user_api_router)
core_app.include_router(models_api_router)

@projects_app.get("/helloworld")
def hello_world():
    return {"message": "Hello, world!"}


app = FastAPI()

@app.on_event("startup")
async def startup_event():
    print("Mounting APIs...")
    app.mount(path="/v1", app=core_app)
    app.mount(path="/projects/v1", app=projects_app)
    # You can add any other startup logic here, such as initializing the database
    print("Initializing database...")
    initialize_db()
    print("Application startup complete.")


@app.on_event("shutdown")
async def shutdown_event():
    # You can add any other shutdown logic here
    print("Application shutdown complete.")