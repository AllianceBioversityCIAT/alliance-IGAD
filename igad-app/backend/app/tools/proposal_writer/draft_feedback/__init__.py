"""Draft Feedback Module

Analyzes user's draft proposal against RFP requirements to provide
section-by-section feedback with status ratings and improvement suggestions.
"""

from app.tools.proposal_writer.draft_feedback.service import DraftFeedbackService
from app.tools.proposal_writer.draft_feedback.config import DRAFT_FEEDBACK_SETTINGS

__all__ = ["DraftFeedbackService", "DRAFT_FEEDBACK_SETTINGS"]
