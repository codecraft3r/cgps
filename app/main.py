from fastapi import FastAPI, Security

from app.utils import VerifyToken
from app.mongo import initialize_db

from app.routes.users import user_api_router

app = FastAPI()
auth = VerifyToken()

app.include_router(user_api_router)

@app.on_event("startup")
async def startup_event():
    print("Starting up the application...")
    # You can add any other startup logic here, such as initializing the database
    initialize_db()
    print("Application startup complete.")

