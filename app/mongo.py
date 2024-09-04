import datetime
from typing import Literal, TypedDict, Optional

from pymongo import MongoClient
from app.config import get_settings

client = MongoClient(get_settings().mongo_uri)
db = client.get_database('bongodb').get_collection('bongodb')

AiProvider = Literal["OpenAI", "AzureOpenAI" "Anthropic", "Google"]


class AiModel(TypedDict):
    _id: str
    provider_id: str
    provider: AiProvider
    createdAt: Optional[datetime.datetime]
    updatedAt: Optional[datetime.datetime]

class RequestUsageLog(TypedDict):
    _id: str
    ai_model_id: str
    applicable_token_bucket_id: str
    tokens_input: int
    tokens_output: int
    request_completed: bool
    createdAt: Optional[datetime.datetime]
    updatedAt: Optional[datetime.datetime]

class TokenBucket(TypedDict):
    _id: str
    applicable_ai_model_ids: list[str]
    applicable_user_name: str
    window_duration_mins: int
    max_tokens_within_window: int
    type: Literal["api-access", "ui-access"]
    createdAt: Optional[datetime.datetime]
    updatedAt: Optional[datetime.datetime]

class User(TypedDict):
    _id: str
    username: str
    email: str
    createdAt: Optional[datetime.datetime]
    updatedAt: Optional[datetime.datetime]


def initialize_db():
    # Check if collections are empty and populate them with initial data if needed
    if db.ai_models.count_documents({}) == 0:
        db.ai_models.insert_many([
            {"provider_id": "gpt-4o-mini", "provider": "OpenAI", "createdAt": datetime.datetime.utcnow(), "updatedAt": datetime.datetime.utcnow()},
            {"provider_id": "claude-3-5-sonnet-20240620", "provider": "Anthropic", "createdAt": datetime.datetime.utcnow(), "updatedAt": datetime.datetime.utcnow()}
        ])
        print("Initialized models collection with default data.")

class DatabaseManager:
    # interacts with the database, provides an interface conforming to the TypedDicts above
    def __init__(self, client, db):
        self.db = db
        sinfo = client.server_info()
        if not sinfo:
            print("Failed to connect to the database")
            return
        print("Connected to the database")
        

    # user
    def insert_user(self, user: User) -> bool:
        user["createdAt"] = datetime.datetime.utcnow()
        user["updatedAt"] = datetime.datetime.utcnow()
        db_user = self.db.users.insert_one(user)
        if not db_user:
            print("Failed to insert user")
            return False
        bucket = {
            "applicable_ai_model_ids": ["gpt-4o-mini"],
            "applicable_user_name": user.get("username"),
            "window_duration_mins": 60,
            "max_tokens_within_window": 100000,
            "type": "ui-access",
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow()
        }
        bucket_result = self.db.token_buckets.insert_one(bucket)
        if not bucket_result:
            print("Failed to insert token bucket")
            return False
        return True
    
    def list_users(self) -> list[User]:
        return list(self.db.users.find({}))
    
    def get_user(self, user_name: str) -> User:
        return self.db.users.find_one({"username": user_name})
    
    def delete_user(self, user_name: str) -> bool:
        return self.db.users.delete_one({"username": user_name})
    

    # ai_model
    def insert_ai_model(self, model: AiModel) -> bool:
        model["createdAt"] = datetime.datetime.utcnow()
        model["updatedAt"] = datetime.datetime.utcnow()
        return self.db.models.insert_one(model)
    
    def list_ai_models(self) -> list[AiModel]:
        return list(self.db.models.find({}))
    
    def list_ai_models_for_user(self, user_name: str) -> list[AiModel]:
        # Find all token buckets associated with the user
        token_buckets = list(self.db.token_buckets.find({"applicable_user_name": user_name, "type": "ui-access"}))
        print(token_buckets)
        # Extract all applicable AI model IDs from the token buckets
        model_ids = set()
        for bucket in token_buckets:
            model_ids.update(bucket.get("applicable_ai_model_ids", []))

        return model_ids
    
    def get_ai_model_by_provider_id(self, ai_model_id: str) -> AiModel:
        return self.db.ai_models.find_one({"provider_id": ai_model_id})
    

    # request_usage_log
    def insert_request_usage_log(self, log: RequestUsageLog):
        log["createdAt"] = datetime.datetime.utcnow()
        log["updatedAt"] = datetime.datetime.utcnow()
        return self.db.request_usage_logs.insert_one(log)
    
    def update_request_usage_log(self, log_id: str, update_fields: dict) -> bool:
        update_fields["updatedAt"] = datetime.datetime.utcnow()
        result = self.db.request_usage_logs.update_one({"_id": log_id}, {"$set": update_fields})
        return result.modified_count > 0
    
    def list_request_usage_logs(self) -> list[RequestUsageLog]:
        return list(self.db.request_usage_logs.find({}))
    
    def get_request_usage_log(self, log_id: str) -> RequestUsageLog:
        return self.db.request_usage_logs.find_one({"_id": log_id})
    
    
    # token_bucket
    def insert_token_bucket(self, token_bucket: TokenBucket):
        token_bucket["createdAt"] = datetime.datetime.utcnow()
        token_bucket["updatedAt"] = datetime.datetime.utcnow()
        return self.db.token_buckets.insert_one(token_bucket)
    def update_token_bucket(self, token_bucket_id: str, token_bucket: TokenBucket):
        token_bucket["updatedAt"] = datetime.datetime.utcnow()
        return self.db.token_buckets.update_one({"_id": token_bucket_id}, {"$set": token_bucket})
    def list_token_buckets(self) -> list[TokenBucket]:
        return list(self.db.token_buckets.find({}))
    def list_token_buckets_for_user(self, user_name: str) -> list[TokenBucket]:
        return list(self.db.token_buckets.find({"applicable_user_name": user_name}))
    def get_token_bucket_for_user_and_model(self, user_name: str, model_id: str) -> TokenBucket:
        """
        Retrieve the token bucket for a specific user and AI model.

        Args:
            user_name (str): The username of the user.
            model_id (str): The ID of the AI model.

        Returns:
            TokenBucket: The token bucket associated with the user and model, or None if not found.
        """
        return self.db.token_buckets.find_one({
            "applicable_user_name": user_name,
            "applicable_ai_model_ids": model_id
        })
    def get_token_bucket(self, token_bucket_id: str) -> TokenBucket:
        return self.db.token_buckets.find_one({"_id": token_bucket_id})

    

db_manager = DatabaseManager(client=client, db=db)

