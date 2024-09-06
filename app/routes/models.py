from fastapi import APIRouter, Security
from typing import Union
from fastapi.responses import JSONResponse
from app.utils import VerifyToken, check_scope
from app.mongo import db_manager, AiModel

models_api_router = APIRouter()
auth = VerifyToken()

@models_api_router.post("/models")
def create_model(auth_result: str = Security(auth.verify), body: dict = AiModel):
    check_scope(auth_result, ["admin:models:edit"])
    model = db_manager.insert_ai_model(body)
    return {"message": "Model created"}
    
@models_api_router.get("/models")
def list_models(auth_result: str = Security(auth.verify), username: Union[str, None] = None):
    if username:
        models = db_manager.list_ai_models_for_user(username)
    else:
        check_scope(auth_result, ["admin:models:edit"])
        models = db_manager.list_ai_models()
    
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

@models_api_router.get("/models/{model_id}")
def get_model(model_id: str, auth_result: str = Security(auth.verify)):
    check_scope(auth_result, ["admin:models:edit"])
    return db_manager.get_ai_model_by_provider_id(model_id)

@models_api_router.delete("/models/{model_id}")
def delete_model(model_id: str, auth_result: str = Security(auth.verify)):
    check_scope(auth_result, ["admin:models:edit"])
    db_manager.delete_ai_model(model_id)
    db_manager.db.token_buckets.delete_many({"applicable_ai_model_ids": model_id})
    return {"message": "Model deleted", "model_id": model_id}

