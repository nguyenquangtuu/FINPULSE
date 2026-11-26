from typing import Any
from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

def success(data: Any = None, message: str = "Success") -> dict:
    return {"success": True, "data": data, "message": message}

def error(code: str, message: str) -> dict:
    return {"success": False, "error": {"code": code, "message": message}}

class AppError(HTTPException):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        super().__init__(status_code=status_code, detail={"code": code, "message": message})

async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": exc.detail})

async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        payload = detail
    else:
        payload = {"code": "HTTP_ERROR", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": payload})

async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    msg = errors[0].get("msg", "Invalid request body") if errors else "Invalid request body"
    loc = ".".join(str(x) for x in errors[0].get("loc", []) if x != "body") if errors else ""
    full_message = f"{loc}: {msg}" if loc else msg
    return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": full_message}})

async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": str(exc)}})
