from fastapi import APIRouter, Security
from app.utils import VerifyToken
from app.mongo import db_manager, AiModel

models_api_router = APIRouter()
auth = VerifyToken()

@models_api_router.post("/v1/models")
def create_model(auth_result: str = Security(auth.verify), body: dict = AiModel):
    roles = auth_result.
    model = db_manager.insert_model(body)
    return {"message": "Model created", "body": model}
    
@models_api_router.get("/v1/models")
def list_models(auth_result: str = Security(auth.verify)):
    return db_manager.list_models()

@models_api_router.get("/v1/models/{model_id}")
def get_model(model_id: str, auth_result: str = Security(auth.verify)):
    return db_manager.get_model(model_id)

@models_api_router.delete("/v1/models/{model_id}")
def delete_model(model_id: str, auth_result: str = Security(auth.verify)):
    db_manager.delete_model(model_id)
    db_manager.db.token_buckets.delete_many({"applicable_ai_model_ids": model_id})
    return {"message": "Model deleted", "model_id": model_id}

