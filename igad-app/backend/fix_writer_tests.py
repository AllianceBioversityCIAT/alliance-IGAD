with open("tests/app/tools/proposal_writer/test_routes.py", "r") as f:
    content = f.read()

import re

# Fix compute steps mock
content = content.replace('"rfp_analysis": {"data": "test"}', '"rfp_analysis_status": "completed"')
content = content.replace('"concept_analysis": {"data": "test"}', '"concept_analysis_status": "completed"')
content = content.replace('"structure_workplan": {"data": "test"}', '"structure_workplan_status": "completed"')
content = content.replace('status["step1"] is True', 'status["1"] is True')

# Fix AsyncMock
content = content.replace('mock_db.update_item = AsyncMock()', 'mock_db.update_item = AsyncMock()\n         mock_db.get_item = AsyncMock(return_value={"user_id": MOCK_USER["user_id"], "proposalCode": "PROP-123"})')
content = content.replace('mock_get_proposal.return_value = {"PK": "PROPOSAL#PROP-123", "SK": "METADATA", "analysis_status_rfp": "processing"}', 'mock_db.get_item = AsyncMock(return_value={"PK": "PROPOSAL#PROP-123", "SK": "METADATA", "analysis_status_rfp": "processing", "user_id": MOCK_USER["user_id"]})')
content = content.replace('mock_get_proposal.return_value = {\n             "PK": "PROPOSAL#PROP-123", \n             "SK": "METADATA", \n             "analysis_status_rfp": "completed",\n             "rfp_analysis": {"result": "success"}\n         }', 'mock_db.get_item = AsyncMock(return_value={"PK": "PROPOSAL#PROP-123", "SK": "METADATA", "analysis_status_rfp": "completed", "rfp_analysis": {"result": "success"}, "user_id": MOCK_USER["user_id"]})')

with open("tests/app/tools/proposal_writer/test_routes.py", "w") as f:
    f.write(content)
