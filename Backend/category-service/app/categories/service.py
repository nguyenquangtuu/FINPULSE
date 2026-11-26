from typing import List, Dict, Any, Optional
from app.categories.repository import CategoryRepository
from app.core.errors import AppError

class CategoryService:
    @staticmethod
    async def get_categories_tree(user_id: str, category_type: Optional[str] = None, include_archived: bool = False) -> List[Dict[str, Any]]:
        rows = await CategoryRepository.list_for_user(user_id, category_type, include_archived=include_archived)
        
        # Build tree structure
        by_id = {}
        for row in rows:
            row["is_system"] = row["user_id"] is None
            row["children"] = []
            by_id[row["category_id"]] = row
            
        root_nodes = []
        for row in rows:
            parent_id = row.get("parent_id")
            if parent_id and parent_id in by_id:
                by_id[parent_id]["children"].append(row)
            else:
                root_nodes.append(row)
                
        return root_nodes

    @staticmethod
    async def create_category(user_id: str, user_role: str, payload: dict) -> dict:
        parent_id = payload.get("parent_id")
        if parent_id:
            parent = await CategoryRepository.get_by_id(parent_id)
            if not parent:
                raise AppError("PARENT_NOT_FOUND", "Danh mục cha không tồn tại", status_code=404)
            if parent.get("type") != payload["type"]:
                raise AppError("TYPE_MISMATCH", "Loại danh mục con phải trùng khớp với danh mục cha", status_code=400)

        # Only ADMIN can create system categories (user_id = None)
        target_user_id = None if (user_role == "ADMIN" and payload.get("is_system")) else user_id
        
        category = await CategoryRepository.create(
            user_id=target_user_id,
            name=payload["name"],
            category_type=payload["type"],
            icon=payload.get("icon") or "folder",
            color=payload.get("color") or "#3B82F6",
            parent_id=parent_id,
        )
        category["is_system"] = category["user_id"] is None
        return category

    @staticmethod
    async def update_category(category_id: str, user_id: str, user_role: str, payload: dict) -> dict:
        category = await CategoryRepository.get_by_id(category_id)
        if not category:
            raise AppError("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục", status_code=404)
        
        # Only prevent editing another user's private category
        if category["user_id"] is not None and category["user_id"] != user_id and user_role != "ADMIN":
            raise AppError("FORBIDDEN", "Không có quyền chỉnh sửa danh mục của người dùng khác", status_code=403)

        updated = await CategoryRepository.update(
            category_id=category_id,
            name=payload.get("name"),
            icon=payload.get("icon"),
            color=payload.get("color"),
            parent_id=payload.get("parent_id"),
        )
        updated["is_system"] = updated["user_id"] is None
        return updated

    @staticmethod
    async def delete_category(category_id: str, user_id: str, user_role: str):
        category = await CategoryRepository.get_by_id(category_id)
        if not category:
            raise AppError("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục", status_code=404)
        
        if category["user_id"] is not None and category["user_id"] != user_id and user_role != "ADMIN":
            raise AppError("FORBIDDEN", "Không có quyền xóa danh mục của người dùng khác", status_code=403)

        # Soft delete (archive)
        await CategoryRepository.soft_delete(category_id)

    @staticmethod
    async def restore_category(category_id: str, user_id: str, user_role: str):
        category = await CategoryRepository.get_by_id(category_id)
        if not category:
            raise AppError("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục", status_code=404)
        
        if category["user_id"] is not None and category["user_id"] != user_id and user_role != "ADMIN":
            raise AppError("FORBIDDEN", "Không có quyền khôi phục danh mục của người dùng khác", status_code=403)

        await CategoryRepository.restore(category_id)
