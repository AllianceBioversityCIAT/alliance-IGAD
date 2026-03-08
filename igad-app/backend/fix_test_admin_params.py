with open("tests/test_admin_prompts_api.py", "r") as f:
    content = f.read()

# Fix status=published to is_active=true
content = content.replace(
    "/admin/prompts/list?section=problem_statement&status=published&tag=test&search=query",
    "/admin/prompts/list?section=problem_statement&is_active=true&tag=test&search=query"
)

# Fix test_get_prompt_not_found from 500 to 404
# Wait, why did get_prompt return 500 when prompt_service.get_prompt returned None?
# Let's check app/handlers/admin_prompts.py lines 132-160
