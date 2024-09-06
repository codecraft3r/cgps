from fastapi import APIRouter, Security
from fastapi.responses import JSONResponse
from bson import ObjectId
from app.utils import VerifyToken, check_scope
from app.mongo import db_manager
import datetime

audit_api_router = APIRouter()
auth = VerifyToken()

def convert_object_id(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: convert_object_id(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_object_id(i) for i in obj]
    return obj

@audit_api_router.get("/token-buckets")
def list_token_buckets(auth_result: str = Security(auth.verify)):
    token_buckets = db_manager.list_token_buckets()
    token_buckets = convert_object_id(token_buckets)
    for bucket in token_buckets:
        if bucket.get("createdAt"):
            bucket["createdAt"] = bucket["createdAt"].isoformat()  # Convert datetime to ISO format string
        if bucket.get("updatedAt"):
            bucket["updatedAt"] = bucket["updatedAt"].isoformat()  # Convert datetime to ISO format string
    return JSONResponse(content={"message": "Token buckets listed", "body": token_buckets})

@audit_api_router.post("/token-buckets")
def create_token_bucket(token_bucket: dict, auth_result: str = Security(auth.verify)):
    token_bucket["createdAt"] = datetime.datetime.utcnow()
    token_bucket["updatedAt"] = datetime.datetime.utcnow()
    result = db_manager.insert_token_bucket(token_bucket)
    if result:
        return JSONResponse(content={"message": "Token bucket created", "body": convert_object_id(result.inserted_id)})
    return JSONResponse(content={"message": "Failed to create token bucket"}, status_code=500)

@audit_api_router.put("/token-buckets/{bucket_id}")
def update_token_bucket(bucket_id: str, token_bucket: dict, auth_result: str = Security(auth.verify)):
    token_bucket["updatedAt"] = datetime.datetime.utcnow()
    result = db_manager.update_token_bucket(bucket_id, token_bucket)
    if not result.modified_count:
        print(result)
        return JSONResponse(content={"message": "Failed to update token bucket"}, status_code=500)
    return JSONResponse(content={"message": "Token bucket updated"})

@audit_api_router.delete("/token-buckets/{bucket_id}")
def delete_token_bucket(bucket_id: str, auth_result: str = Security(auth.verify)):
    result = db_manager.delete_token_bucket(bucket_id)
    if result.deleted_count > 0:
        return JSONResponse(content={"message": "Token bucket deleted"})
    return JSONResponse(content={"message": "Failed to delete token bucket"}, status_code=500)

@audit_api_router.get("/usage-logs")
def list_usage_logs(auth_result: str = Security(auth.verify)):
    usage_logs = db_manager.list_request_usage_logs()
    usage_logs = convert_object_id(usage_logs)
    for log in usage_logs:
        if log.get("createdAt"):
            log["createdAt"] = log["createdAt"].isoformat()  # Convert datetime to ISO format string
        if log.get("updatedAt"):
            log["updatedAt"] = log["updatedAt"].isoformat()  # Convert datetime to ISO format string
    return JSONResponse(content={"message": "Usage logs listed", "body": usage_logs})
