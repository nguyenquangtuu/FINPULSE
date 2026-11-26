from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.categories.schemas import CategoryCreate, CategoryUpdate
from app.categories.service import CategoryService
from app.categories.repository import CategoryRepository
from app.core.security import get_current_user_claims, verify_internal_key
from app.core.errors import success, AppError

router = APIRouter()

@router.get("")
async def get_categories(
    type: Optional[str] = Query(None, pattern="^(INCOME|EXPENSE)$"),
    format: Optional[str] = Query("tree", pattern="^(tree|flat)$"),
    include_archived: bool = Query(False),
    claims: dict = Depends(get_current_user_claims),
):
    if format == "flat":
        categories = await CategoryRepository.list_for_user(claims["sub"], type, include_archived=include_archived)
        for c in categories:
            c["is_system"] = c["user_id"] is None
        return success(data=categories)
    
    tree = await CategoryService.get_categories_tree(claims["sub"], type, include_archived=include_archived)
    return success(data=tree)

@router.get("/{category_id}")
async def get_category_by_id(category_id: str, claims: dict = Depends(get_current_user_claims)):
    category = await CategoryRepository.get_by_id(category_id)
    if not category:
        raise AppError("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục", status_code=404)
    category["is_system"] = category["user_id"] is None
    return success(data=category)

@router.post("")
async def create_category(payload: CategoryCreate, claims: dict = Depends(get_current_user_claims)):
    created = await CategoryService.create_category(
        user_id=claims["sub"],
        user_role=claims.get("role", "USER"),
        payload=payload.model_dump(),
    )
    return success(data=created, message="Tạo danh mục mới thành công")

@router.put("/{category_id}")
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    claims: dict = Depends(get_current_user_claims),
):
    updated = await CategoryService.update_category(
        category_id=category_id,
        user_id=claims["sub"],
        user_role=claims.get("role", "USER"),
        payload=payload.model_dump(exclude_unset=True),
    )
    return success(data=updated, message="Cập nhật danh mục thành công")

@router.delete("/{category_id}")
async def delete_category(category_id: str, claims: dict = Depends(get_current_user_claims)):
    await CategoryService.delete_category(
        category_id=category_id,
        user_id=claims["sub"],
        user_role=claims.get("role", "USER"),
    )
    return success(message="Lưu trữ ẩn danh mục thành công (Soft Delete)")

@router.post("/{category_id}/restore")
async def restore_category(category_id: str, claims: dict = Depends(get_current_user_claims)):
    await CategoryService.restore_category(
        category_id=category_id,
        user_id=claims["sub"],
        user_role=claims.get("role", "USER"),
    )
    return success(message="Khôi phục danh mục thành công")

# --- Internal Inter-Service Endpoints ---
@router.get("/internal/{category_id}", dependencies=[Depends(verify_internal_key)])
async def get_category_internal(category_id: str):
    category = await CategoryRepository.get_by_id(category_id)
    if not category:
        raise AppError("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục", status_code=404)
    category["is_system"] = category["user_id"] is None
    return success(data=category)
