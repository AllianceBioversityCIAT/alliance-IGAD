from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_newsletters():
    return {"message": "Newsletters endpoint"}
