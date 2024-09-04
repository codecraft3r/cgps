
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from app.utils import VerifyToken, check_scope
from app.mongo import db_manager, AiModel

models_api_router = APIRouter()


@models_api_router.get("/models")
def list_models(request: Request):
    username = request.state.owner_id
    models = db_manager.list_ai_models_for_user(username, access_type="api-access")
    formatted_models = {
        "object": "list",
        "data": [
            {
                "id": model["provider_id"],
                "object": "model",
                "created": int(model["createdAt"].timestamp()),
                "owned_by": model["provider"],
            } for model in models
        ]
    }
    return JSONResponse(content=formatted_models)