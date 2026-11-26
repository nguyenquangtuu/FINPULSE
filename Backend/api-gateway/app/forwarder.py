import logging
import httpx
from fastapi import Request, Response
from fastapi.responses import StreamingResponse

logger = logging.getLogger("api-gateway.forwarder")

EXCLUDED_HEADERS = {
    "content-length",
    "content-encoding",
    "transfer-encoding",
    "connection",
    "host",
}

async def forward_request(target_url: str, request: Request, injected_headers: dict) -> Response:
    """
    Forwards incoming HTTP request to destination downstream microservice.
    """
    client = httpx.AsyncClient(timeout=30.0)
    try:
        # Prepare headers
        headers = dict(request.headers)
        headers.update(injected_headers)
        # Remove hop-by-hop headers
        headers = {k: v for k, v in headers.items() if k.lower() not in EXCLUDED_HEADERS}

        body = await request.body()
        resp = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            params=dict(request.query_params),
            content=body,
        )

        response_headers = {
            k: v for k, v in resp.headers.items() if k.lower() not in EXCLUDED_HEADERS
        }

        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers=response_headers,
            media_type=resp.headers.get("content-type"),
        )
    finally:
        await client.aclose()
