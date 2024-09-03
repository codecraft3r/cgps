from fastapi import APIRouter, status, Security, HTTPException
from app.utils import VerifyToken
from app.mongo import db_manager, User
import datetime

user_api_router = APIRouter()
auth = VerifyToken()

@user_api_router.get("/v1/user/{user_name}")
def get_user(user_name: str, auth_result: str = Security(auth.verify), body: dict = {}):
    return db_manager.get_user(user_name)
    
@user_api_router.post("/v1/user")
def create_user(auth_result: str = Security(auth.verify), body: dict = User):
    user = db_manager.insert_user(body)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User creation failed")
    return {"message": "User created", "body": {"success": user}}

@user_api_router.delete("/v1/user/{user_name}")
def delete_user(user_name: str, auth_result: str = Security(auth.verify)):
    db_manager.delete_user(user_name)
    db_manager.db.token_buckets.delete_many({"applicable_user_name": user_name})
    return {"message": "User deleted", "success": user_name}

@user_api_router.get("/v1/user/{user_name}/token_buckets")
def list_token_buckets_for_user(user_name: str, auth_result: str = Security(auth.verify)):
    return db_manager.list_token_buckets_for_user(user_name)

@user_api_router.get("/v1/uses/{user_name}/token_buckets/{token_bucket_id}")
def get_token_bucket(user_name: str, token_bucket_id: str, auth_result: str = Security(auth.verify)):
    return db_manager.get_token_bucket(token_bucket_id)

@user_api_router.post("/v1/user/{user_name}/token_buckets")
def create_token_bucket(user_name: str, auth_result: str = Security(auth.verify), body: dict = {}):
    bucket = db_manager.insert_token_bucket(body)
    return {"message": "Token bucket created", "body": bucket}

@user_api_router.get("/v1/user/{user_name}/models")
def list_ai_models_for_user(user_name: str, auth_result: str = Security(auth.verify)):
    return db_manager.list_ai_models_for_user(user_name)

@user_api_router.get("/v1/users")
def list_users(auth_result: str = Security(auth.verify)):
    return db_manager.list_users()