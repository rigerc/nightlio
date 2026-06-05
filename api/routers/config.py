from fastapi import APIRouter
from api.config import get_config, config_to_public_dict
from api.schemas.config import ConfigResponse

router = APIRouter()


@router.get("/config", response_model=ConfigResponse)
def get_public_config():
    return config_to_public_dict(get_config())
