"""
Proposal Document Generation Service

Generates refined proposal documents based on:
- Draft proposal content
- AI-generated section feedback
- User comments and guidance

Following the same pattern as concept_document_generation.
"""

from app.tools.proposal_writer.proposal_document_generation.service import (
    proposal_document_generator,
)

__all__ = ["proposal_document_generator"]
