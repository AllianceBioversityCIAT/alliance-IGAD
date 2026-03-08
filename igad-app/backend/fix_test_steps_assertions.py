with open("tests/app/tools/proposal_writer/test_routes.py", "r") as f:
    content = f.read()

import re

# Add proposal_template_status to mock proposal
content = content.replace('"structure_workplan_status": "completed"}', '"structure_workplan_status": "completed", "proposal_template_status": "completed", "proposal_template": {"content": "ok"}}')

content = content.replace('assert status["1"] is True', 'assert status["step_1"]["completed"] is True')
content = content.replace('assert status["step2"] is True', 'assert status["step_2"]["completed"] is True')
content = content.replace('assert status["step3"] is True', 'assert status["step_3"]["completed"] is True')
content = content.replace('assert status["step4"] is False', 'assert status["step_4"]["completed"] is False')

with open("tests/app/tools/proposal_writer/test_routes.py", "w") as f:
    f.write(content)
