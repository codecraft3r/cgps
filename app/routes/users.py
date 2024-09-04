from fastapi import APIRouter, status, Security, Depends, HTTPException
from app.utils import VerifyToken, check_scope
from app.mongo import db_manager, User, TokenBucket
import datetime

user_api_router = APIRouter()
auth = VerifyToken()

@user_api_router.get("/user/{user_name}")
def get_user(user_name: str, auth_result: str = Security(auth.verify)):
    return db_manager.get_user(user_name)
    
@user_api_router.post("/user")
def create_user(auth_result: str = Security(auth.verify), body: dict = User):
    check_scope(auth_result, ["admin:user:edit"])
    user = db_manager.insert_user(body)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User creation failed")
    return {"message": "User created", "body": {"success": user}}

@user_api_router.delete("/user/{user_name}")
def delete_user(user_name: str, auth_result: str = Security(auth.verify)):
    check_scope(auth_result, ["admin:user:edit"])
    db_manager.delete_user(user_name)
    db_manager.db.token_buckets.delete_many({"applicable_user_name": user_name})
    return {"message": "User deleted", "success": user_name}

@user_api_router.get("/user/{user_name}/token_buckets")
def list_token_buckets_for_user(user_name: str, auth_result: str = Security(auth.verify)):
    return db_manager.list_token_buckets_for_user(user_name)

@user_api_router.get("/uses/{user_name}/token_buckets/{token_bucket_id}")
def get_token_bucket(user_name: str, token_bucket_id: str, auth_result: str = Security(auth.verify)):
    return db_manager.get_token_bucket(token_bucket_id)

@user_api_router.post("/user/{user_name}/token_buckets")
def create_token_bucket(user_name: str, auth_result: str = Security(auth.verify), body: dict = TokenBucket):
    check_scope(auth_result, ["admin:user:assign_models"])
    bucket = db_manager.insert_token_bucket(body)
    return {"message": "Token bucket created", "body": bucket}

@user_api_router.get("/user/{user_name}/models")
def list_ai_models_for_user(user_name: str, auth_result: str = Security(auth.verify)):
    return db_manager.list_ai_models_for_user(user_name)

@user_api_router.get("/users")
def list_users(auth_result: str = Security(auth.verify)):
    return db_manager.list_users()