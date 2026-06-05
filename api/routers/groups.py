from fastapi import APIRouter, HTTPException
from api.services.group_service import GroupService
from api.schemas.groups import GroupCreate, GroupUpdate, ReorderRequest, OptionCreate, OptionUpdate


def create_group_router(group_service: GroupService) -> APIRouter:
    router = APIRouter()

    @router.get("/groups")
    def get_groups():
        try:
            return group_service.get_all_groups()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/groups", status_code=201)
    def create_group(body: GroupCreate):
        try:
            group_id = group_service.create_group(body.name)
            return {"status": "success", "group_id": group_id, "message": "Group created successfully"}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/groups/reorder")
    def reorder_groups(body: ReorderRequest):
        try:
            group_service.reorder_groups(body.ordered_ids)
            return {"status": "success"}
        except (TypeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.patch("/groups/{group_id}")
    def update_group(group_id: int, body: GroupUpdate):
        try:
            kwargs = body.model_dump(exclude_none=True)
            if not kwargs:
                raise HTTPException(status_code=400, detail="No valid fields to update")
            success = group_service.update_group(group_id, **kwargs)
            if not success:
                raise HTTPException(status_code=404, detail="Group not found")
            return {"status": "success", "message": "Group updated successfully"}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete("/groups/{group_id}")
    def delete_group(group_id: int):
        try:
            success = group_service.delete_group(group_id)
            if not success:
                raise HTTPException(status_code=404, detail="Group not found")
            return {"status": "success", "message": "Group deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/groups/{group_id}/options", status_code=201)
    def create_group_option(group_id: int, body: OptionCreate):
        try:
            option_id = group_service.create_group_option(group_id, body.name)
            return {"status": "success", "option_id": option_id, "message": "Option created successfully"}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/groups/{group_id}/options/reorder")
    def reorder_group_options(group_id: int, body: ReorderRequest):
        try:
            group_service.reorder_group_options(group_id, body.ordered_ids)
            return {"status": "success"}
        except (TypeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.patch("/options/{option_id}")
    def update_option(option_id: int, body: OptionUpdate):
        try:
            kwargs = body.model_dump(exclude_none=True)
            if not kwargs:
                raise HTTPException(status_code=400, detail="No valid fields to update")
            success = group_service.update_group_option(option_id, **kwargs)
            if not success:
                raise HTTPException(status_code=404, detail="Option not found")
            return {"status": "success", "message": "Option updated successfully"}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete("/options/{option_id}")
    def delete_option(option_id: int):
        try:
            success = group_service.delete_group_option(option_id)
            if not success:
                raise HTTPException(status_code=404, detail="Option not found")
            return {"status": "success", "message": "Option deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
