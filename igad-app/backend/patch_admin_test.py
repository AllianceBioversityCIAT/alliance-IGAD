import re

with open("tests/test_admin_prompts_api.py", "r") as f:
    content = f.read()

override_code = """
from app.handlers.admin_prompts import get_current_admin_user

def override_get_current_admin_user():
    return {"sub": "test-admin", "email": "admin@example.com"}

app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user
"""

if "override_get_current_admin_user" not in content:
    content = content.replace("app.include_router(router)", "app.include_router(router)\n" + override_code)

with open("tests/test_admin_prompts_api.py", "w") as f:
    f.write(content)
