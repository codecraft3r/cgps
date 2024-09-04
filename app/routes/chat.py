from fastapi import APIRouter, Request, HTTPException, Security
from fastapi.responses import StreamingResponse
from app.utils import VerifyToken
from app.config import get_settings
from app.mongo import db_manager
from typing import TypedDict, Optional, Union, List
import tiktoken
from openai import OpenAI
import json
import httpx
import datetime

chat_api_router = APIRouter()
auth = VerifyToken()

class SystemMessage(TypedDict):
    role: str
    content: Union[str, List[str]]
    name: Optional[str]

class UserMessage(TypedDict):
    role: str
    content: Union[str, List[str]]
    name: Optional[str]

class AssistantMessage(TypedDict):
    role: str
    content: Optional[Union[str, List[str]]]
    refusal: Optional[Union[str, None]]
    name: Optional[str]
    tool_calls: Optional[List[dict]]
    function_call: Optional[Union[dict, None]]

class ToolMessage(TypedDict):
    role: str
    content: Union[str, List[str]]
    tool_call_id: str

class FunctionMessage(TypedDict):
    role: str
    content: Optional[Union[str, None]]
    name: str

Message = Union[SystemMessage, UserMessage, AssistantMessage, ToolMessage, FunctionMessage]


@chat_api_router.post("/chat")
async def chat_endpoint(request: Request, auth_result: str = Security(auth.verify)):

    body = await request.json()
    model_id = body.get("model_id")
    user_name = body.get("username")
    chat_history: list[Message] = body.get("input")

    if not model_id or not chat_history or not user_name:
        raise HTTPException(status_code=400, detail="Model ID, input text, and username are required")

    # Log input tokens
    encoding = tiktoken.get_encoding("cl100k_base")
    chat_history_text = " ".join([message["content"] for message in chat_history])
    input_tokens = len(encoding.encode(chat_history_text))
    token_bucket = db_manager.get_token_bucket_for_user_and_model(user_name, model_id)
    if not token_bucket:
        raise HTTPException(status_code=404, detail="Token bucket not found for user and model")

    log = {
        "ai_model_id": model_id,
        "applicable_token_bucket_id": token_bucket["_id"],
        "tokens_input": input_tokens,
        "tokens_output": 0,
        "request_completed": False,
    }
    log_id = db_manager.insert_request_usage_log(log).inserted_id

    limit_exceeded = limit_usage(user_name, model_id, input_tokens)
    if limit_exceeded:
        raise HTTPException(status_code=429, detail="Token limit exceeded")
    
    # Call the appropriate model API
    ai_provider = db_manager.get_ai_model_by_provider_id(model_id).get("provider")
    max_tokens = db_manager.get_ai_model_by_provider_id(model_id).get("max_tokens")
    if not max_tokens:
        max_tokens = 2048
    if ai_provider == "OpenAI":
        client = OpenAI(
           api_key=get_settings().openai_api_key 
        )
        response = client.chat.completions.create(
            model=model_id,
            stream=True,
            messages=chat_history,
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return StreamingResponse(stream_openai_response(response, encoding=encoding, log_id=log_id), media_type="application/json")
    elif ai_provider == "Anthropic":
        anthropic_formatted_messages = chat_history[1:]

        def get_media_type_from_data_url(data_url):
            return data_url.split(';')[0].split(':')[1]

        def get_base64_from_data_url(data_url):
            return data_url.split(',')[1]

        for message in anthropic_formatted_messages:
            if not isinstance(message.get("content"), list):
                continue

            formatted_content = []
            for content in message["content"]:
                if content.get("type") == "image_url" and isinstance(content.get("image_url", {}).get("url"), str):
                    image_url = content["image_url"]["url"]
                    formatted_content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": get_media_type_from_data_url(image_url),
                            "data": get_base64_from_data_url(image_url)
                        }
                    })
                else:
                    formatted_content.append(content)
            message["content"] = formatted_content
        client = httpx.AsyncClient()
        anthropic_api_key = get_settings().anthropic_api_key
        headers = {
            "x-api-key": anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": model_id,
            "max_tokens": max_tokens,
            "messages": chat_history,
            "stream": True,
        }
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return StreamingResponse(stream_anthropic_response(response, encoding=encoding, model_id=model_id, log_id=log_id), media_type="application/json")
    else:
        raise HTTPException(status_code=400, detail="Unsupported model provider")

def stream_openai_response(response, encoding, log_id):
    output_tokens = 0
    def count_tokens(choices):
        for choice in choices:
            if hasattr(choice.delta, 'content') and choice.delta.content:
                content = choice.delta.content
                nonlocal output_tokens
                output_tokens += len(encoding.encode(content))

    for chunk in response:
        count_tokens(chunk.choices)
        yield json.dumps(chunk.json())

    # Update log with output tokens and mark as completed
    db_manager.update_request_usage_log(log_id, {
        "tokens_output": output_tokens,
        "request_completed": True
    })

async def stream_anthropic_response(response, encoding, model_id, log_id):
    output_tokens = 0
    partial_json = ""

    async for line in response.aiter_lines():
        if line:
            line = line.strip()
            if not line:
                continue  # Skip empty lines

            if line.startswith("event:"):
                event = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                data_str = line.split(":", 1)[1].strip()
                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    print(f"Invalid JSON data received: {data_str}")
                    continue  # Skip invalid JSON data

                if event == "content_block_delta" and data["type"] == "content_block_delta":
                    partial_json += data["delta"]["text"]
                    # Count tokens for the current chunk
                    output_tokens += len(encoding.encode(data["delta"]["text"]))
                    openai_response = {
                        "id": "chatcmpl-A3cHlLQjS28eMLxhcee4WWrMVpBUv",  # Example ID, replace with actual ID if available
                        "choices": [
                            {
                                "delta": {
                                    "content": partial_json,
                                    "function_call": None,
                                    "refusal": None,
                                    "role": None,
                                    "tool_calls": None
                                },
                                "finish_reason": None,
                                "index": 0,
                                "logprobs": None
                            }
                        ],
                        "created": int(datetime.datetime.utcnow().timestamp()),
                        "model": model_id,
                        "object": "chat.completion.chunk",
                        "service_tier": None,
                        "system_fingerprint": "fp_f33667828e",
                        "usage": None
                    }
                    yield json.dumps(openai_response)
                elif event == "content_block_stop" and data["type"] == "content_block_stop":
                    # Parse the accumulated partial JSON
                    final_json = partial_json
                    openai_response = {
                        "id": "chatcmpl-A3cHlLQjS28eMLxhcee4WWrMVpBUv",  # Example ID, replace with actual ID if available
                        "choices": [
                            {
                                "delta": {
                                    "content": final_json,
                                    "function_call": None,
                                    "refusal": None,
                                    "role": None,
                                    "tool_calls": None
                                },
                                "finish_reason": "stop",
                                "index": 0,
                                "logprobs": None
                            }
                        ],
                        "created": int(datetime.datetime.utcnow().timestamp()),
                        "model": model_id,
                        "object": "chat.completion.chunk",
                        "service_tier": None,
                        "system_fingerprint": "fp_f33667828e",
                        "usage": None
                    }
                    yield json.dumps(openai_response)
                    partial_json = ""  # Reset for the next content block
                else:
                    continue  # Skip unknown event types

    # Update log with output tokens and mark as completed
    db_manager.update_request_usage_log(log_id, {
        "tokens_output": output_tokens,
        "request_completed": True
    })

def limit_usage(user_name: str, model_id: str, tokens_requested: int) -> bool:
    """
    Check if the user has exceeded their token usage limit for a specific model within the defined window duration.
    
    Args:
        user_name (str): The username of the user.
        model_id (str): The ID of the AI model.
        tokens_requested (int): The number of tokens requested in the current operation.
    
    Returns:
        bool: True if the token limit is exceeded, False otherwise.
    """
    # Fetch the token bucket associated with the user and model
    token_bucket = db_manager.get_token_bucket_for_user_and_model(user_name, model_id)
    
    if not token_bucket:
        return False  # No token bucket found, no limit to enforce
    
    # Calculate the start time of the window
    window_start_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=token_bucket["window_duration_mins"])
    
    # Fetch all usage logs within the window duration for the current token bucket
    usage_logs = db_manager.db.request_usage_logs.find({
        "applicable_token_bucket_id": token_bucket["_id"],
        "createdAt": {"$gte": window_start_time}
    })
    
    # Calculate the total tokens used within the window
    total_tokens_used = sum(log["tokens_input"] + log["tokens_output"] for log in usage_logs)
    
    # Check if the requested tokens would exceed the limit
    if total_tokens_used + tokens_requested > token_bucket["max_tokens_within_window"]:
        return True
    
    return False


