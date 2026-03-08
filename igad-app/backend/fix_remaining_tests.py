import re

# Fix test_prompt_router.py
with open("tests/test_prompt_router.py", "r") as f:
    content = f.read()

# Instead of patching AuthMiddleware, override dependency
auth_override = """from app.handlers.admin_prompts import get_current_admin_user

def override_auth():
    return {"sub": "test-admin", "role": "admin"}

app.dependency_overrides[get_current_admin_user] = override_auth

@pytest.fixture
def mock_auth_middleware():
    pass
"""

content = re.sub(
    r'@pytest\.fixture\ndef mock_auth_middleware\(\):\n\s*"""Mock authentication middleware\."""\n\s*with patch\("app\.handlers\.admin_prompts\.AuthMiddleware"\) as mock:\n\s*yield mock',
    auth_override,
    content
)
with open("tests/test_prompt_router.py", "w") as f:
    f.write(content)

# Fix test_vector_storage.py
with open("tests/test_vector_storage.py", "r") as f:
    content = f.read()

content = re.sub(
    r'with patch\(\n\s*"app\.shared\.vectors\.service\.get_aws_session", return_value=session\n\s*\):',
    'with patch("app.shared.vectors.service.boto3.client") as mock_client:\n        mock_client.side_effect = lambda service, **kwargs: {"s3": s3_client, "bedrock-runtime": bedrock_client, "s3vectors": s3_client}.get(service, session.client(service))',
    content
)

with open("tests/test_vector_storage.py", "w") as f:
    f.write(content)

