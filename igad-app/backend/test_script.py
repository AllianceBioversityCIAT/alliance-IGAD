from app.tools.proposal_writer.routes import _compute_completed_steps, _compute_step_completion

proposal = {
    "metadata": {
        "rfp_analysis": {"test": "ok"}, 
        "concept_analysis": {"test": "ok"}, 
        "structure_workplan": {"test": "ok"}, 
        "rfp_analysis_status": "completed", 
        "concept_analysis_status": "completed", 
        "structure_workplan_status": "completed",
        "proposal_template_status": "completed",
        "proposal_template": {"content": "ok"}
    }
}
print(_compute_completed_steps(proposal))
print(_compute_step_completion(proposal))
