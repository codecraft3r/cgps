from functools import lru_cache

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    auth0_domain: str
    auth0_api_audience: str
    auth0_issuer: str
    auth0_algorithms: str
    anthropic_api_key: str
    openai_api_key: str
    mongo_uri: str

    class Config:
        env_file = ".env"
    

@lru_cache()
def get_settings() -> Settings:
    return Settings()