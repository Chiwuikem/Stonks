import requests

BASE_URL = "http://localhost:7070"

try:
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    print("Status Code:", r.status_code)
    print("Response:", r.text)
except requests.exceptions.RequestException as e:
    print("Connection Error:", e)
