import time
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def health_check():
    return {
        "status": "healthy",
        "message": "Nightlio API is running",
        "timestamp": time.time(),
    }


@router.get("/time")
def get_current_time():
    return {"time": time.time()}
