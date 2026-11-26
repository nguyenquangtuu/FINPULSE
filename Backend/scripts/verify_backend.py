"""
FINPULSE Backend Verification Script
Kiểm tra tính sẵn sàng và các luồng liên dịch vụ (E2E Integration Flow)
"""

import asyncio
import httpx

GATEWAY_URL = "http://localhost:8000"

SERVICES = {
    "API Gateway": "http://localhost:8000/health",
    "auth-service": "http://localhost:8001/health",
    "finance-core-service": "http://localhost:8002/health",
    "category-service": "http://localhost:8003/health",
    "analytics-service": "http://localhost:8004/health",
    "attachment-service": "http://localhost:8005/health",
    "ocr-service": "http://localhost:8006/health",
    "notification-service": "http://localhost:8007/health",
}

async def check_health():
    print("\n🔍 1. KIỂM TRA TRẠNG THÁI SỨC KHỎE (HEALTH CHECKS):")
    async with httpx.AsyncClient(timeout=4.0) as client:
        for name, url in SERVICES.items():
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    print(f"  ✅ {name:<22}: OK (200)")
                else:
                    print(f"  ❌ {name:<22}: Failed ({resp.status_code})")
            except Exception as e:
                print(f"  ⚠️ {name:<22}: Không kết nối được ({e})")

async def test_auth_and_flows():
    print("\n🚀 2. KIỂM THỬ LUỒNG NGHIỆP VỤ LIÊN DỊCH VỤ QUA GATEWAY:")
    async with httpx.AsyncClient(timeout=10.0) as client:
        # A. Login OTP Request
        print("  • Gửi yêu cầu đăng nhập OTP cho 'demo@finpulse.local'...")
        try:
            resp = await client.post(
                f"{GATEWAY_URL}/api/auth/login-request",
                json={"email": "demo@finpulse.local"},
            )
            print(f"    Kết quả: {resp.status_code} - {resp.json().get('message')}")
        except Exception as e:
            print(f"    Lỗi kết nối: {e}")

        # B. Test Categories
        print("  • Kiểm tra lấy danh mục chuẩn hệ thống...")
        try:
            # We can use mock/sample header or internal key
            resp = await client.get("http://localhost:8003/api/categories?format=flat", headers={"X-User-Id": "22222222-2222-2222-2222-222222222222"})
            if resp.status_code == 200:
                cats = resp.json().get("data", [])
                print(f"    ✅ Lấy thành công {len(cats)} danh mục từ category-service")
            else:
                print(f"    Status: {resp.status_code}")
        except Exception as e:
            print(f"    Lỗi: {e}")

if __name__ == "__main__":
    asyncio.run(check_health())
    asyncio.run(test_auth_and_flows())
