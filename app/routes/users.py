from fastapi import APIRouter, status, Security, Depends, HTTPException
from fastapi.responses import JSONResponse
from app.utils import VerifyToken, check_scope
from app.mongo import db_manager, User, TokenBucket
import datetime

user_api_router = APIRouter()
auth = VerifyToken()

@user_api_router.get("/user/{user_name}")
def get_user(user_name: str, auth_result: str = Security(auth.verify)):
    user = db_manager.get_user(user_name)
    return JSONResponse(content=user)

@user_api_router.post("/user")
def create_user(auth_result: str = Security(auth.verify), body: dict = User):
    check_scope(auth_result, ["admin:user:edit"])
    user = db_manager.insert_user(body)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User creation failed")
    return JSONResponse(content={"message": "User created", "body": {"success": user}})

@user_api_router.delete("/user/{user_name}")
def delete_user(user_name: str, auth_result: str = Security(auth.verify)):
    check_scope(auth_result, ["admin:user:edit"])
    db_manager.delete_user(user_name)
    db_manager.db.token_buckets.delete_many({"applicable_user_name": user_name})
    return JSONResponse(content={"message": "User deleted", "success": user_name})

@user_api_router.get("/user/{user_name}/token_buckets")
def list_token_buckets_for_user(user_name: str, auth_result: str = Security(auth.verify)):
    token_buckets = db_manager.list_token_buckets_for_user(user_name)
    return JSONResponse(content=token_buckets)

@user_api_router.get("/user/{user_name}/token_buckets/{token_bucket_id}")
def get_token_bucket(user_name: str, token_bucket_id: str, auth_result: str = Security(auth.verify)):
    token_bucket = db_manager.get_token_bucket(token_bucket_id)
    return JSONResponse(content=token_bucket)

@user_api_router.post("/user/{user_name}/token_buckets")
def create_token_bucket(user_name: str, auth_result: str = Security(auth.verify), body: dict = TokenBucket):
    check_scope(auth_result, ["admin:user:assign_models"])
    bucket = db_manager.insert_token_bucket(body)
    return JSONResponse(content={"message": "Token bucket created", "body": bucket})

@user_api_router.get("/users")
def list_users(auth_result: str = Security(auth.verify)):
    users = db_manager.list_users()
    for user in users:
        user["_id"] = str(user["_id"])  # Convert ObjectId to string
        if user.get("createdAt"):
            user["createdAt"] = user["createdAt"].isoformat()  # Convert datetime to ISO format string
        if user.get("updatedAt"):
            user["updatedAt"] = user["updatedAt"].isoformat()  # Convert datetime to ISO format string
    return JSONResponse(content={"message": "Users listed", "body": users})