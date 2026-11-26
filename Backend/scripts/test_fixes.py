import httpx

API_URL = "http://localhost:8000"

def test_all():
    print("1. Requesting login OTP...")
    r = httpx.post(f"{API_URL}/api/auth/login-request", json={"email": "demo@finpulse.local"})
    assert r.status_code == 200, r.text

    print("2. Fetching OTP from Mailpit...")
    mail = httpx.get("http://localhost:8025/api/v1/messages").json()
    import re
    match = re.search(r"là:\s*(\d{6})", mail["messages"][0]["Snippet"])
    otp = match.group(1)
    print(f"Got OTP: {otp}")

    print("3. Verifying OTP...")
    r = httpx.post(f"{API_URL}/api/auth/verify-otp", json={"email": "demo@finpulse.local", "otp_code": otp})
    assert r.status_code == 200, r.text
    token = r.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("4. Testing Gateway blocking /internal/ from outside...")
    r = httpx.get(f"{API_URL}/api/finance/internal/user-transactions?user_id=test", headers=headers)
    print(f"Status for /internal/: {r.status_code} (Expected: 403)")
    assert r.status_code == 403

    print("5. Testing Category update (Personal user override on system category)...")
    r = httpx.put(
        f"{API_URL}/api/categories/20000000-0000-0000-0000-000000000001",
        json={"name": "Ăn uống & Cà phê sáng"},
        headers=headers,
    )
    print(f"Category update response: {r.status_code}, data: {r.json()}")
    assert r.status_code == 200

    print("6. Verifying User gets their customized category in /api/categories...")
    r = httpx.get(f"{API_URL}/api/categories?format=flat", headers=headers)
    cats = r.json()["data"]
    target = next((c for c in cats if c["category_id"] == "20000000-0000-0000-0000-000000000001"), None)
    print(f"User sees category name: '{target['name']}' (Expected: 'Ăn uống & Cà phê sáng')")
    assert target["name"] == "Ăn uống & Cà phê sáng"

    print("7. Testing Analytics Breakdown...")
    r = httpx.get(f"{API_URL}/api/analytics/breakdown", headers=headers)
    print(f"Breakdown: {r.json()['data']}")

    print("8. Testing PDF Report export...")
    r = httpx.get(f"{API_URL}/api/analytics/export?format=pdf", headers=headers)
    print(f"PDF status: {r.status_code}, length: {len(r.content)} bytes")
    assert r.status_code == 200
    assert len(r.content) > 50000 # Verified font embedded

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_all()
