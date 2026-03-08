with open("tests/test_admin_prompts_api.py", "r") as f:
    content = f.read()

# Fix unauthorized test to remove the override temporarily
auth_override_fix = """    @pytest.mark.unit
    def test_unauthorized_request(self, client):
        \"\"\"Test request without authorization header\"\"\"
        app.dependency_overrides.pop(get_current_admin_user, None)
        try:
            response = client.get("/admin/prompts/list")
            assert response.status_code in [401, 403]  # Forbidden without auth
        finally:
            app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user
"""

import re
content = re.sub(
    r'    @pytest\.mark\.unit\n    def test_unauthorized_request\(self, client\):\n        """Test request without authorization header"""\n        response = client\.get\("/admin/prompts/list"\)\n\n        assert response\.status_code == 403.*?$',
    auth_override_fix,
    content,
    flags=re.MULTILINE | re.DOTALL
)

with open("tests/test_admin_prompts_api.py", "w") as f:
    f.write(content)
