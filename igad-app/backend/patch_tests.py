import re

# Fix test_bedrock_service.py
with open("tests/test_bedrock_service.py", "r") as f:
    content = f.read()

content = re.sub(
    r'with patch\(\s*"app.shared.ai.bedrock_service.boto3.client",\s*return_value=mock_bedrock_client,\s*\):',
    'with patch("app.shared.ai.bedrock_service.get_aws_session") as mock_get_session:\n            mock_get_session.return_value.client.return_value = mock_bedrock_client',
    content
)

with open("tests/test_bedrock_service.py", "w") as f:
    f.write(content)

# Fix test_prompt_service.py
with open("tests/test_prompt_service.py", "r") as f:
    content = f.read()

content = re.sub(
    r'with patch\("app\.tools\.admin\.prompts_manager\.service\.boto3\.resource"\) as mock_resource:\n\s*mock_dynamodb = Mock\(\)\n\s*mock_dynamodb\.Table\.return_value = mock_dynamodb_table',
    'with patch("app.tools.admin.prompts_manager.service.get_aws_session") as mock_get_session:\n            mock_resource = mock_get_session.return_value.resource\n            mock_dynamodb = mock_resource.return_value\n            mock_dynamodb.Table.return_value = mock_dynamodb_table',
    content
)

with open("tests/test_prompt_service.py", "w") as f:
    f.write(content)
