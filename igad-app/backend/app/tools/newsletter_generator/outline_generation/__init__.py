"""
Outline Generation Package

Provides AI-powered newsletter outline generation using:
- Step 1 configuration (tone, audience, length)
- Step 2 retrieved content from Knowledge Base
- Bedrock Claude for intelligent outline creation
"""

from app.tools.newsletter_generator.outline_generation.config import (
    OUTLINE_GENERATION_SETTINGS,
)
from app.tools.newsletter_generator.outline_generation.service import (
    OutlineGenerationService,
)

__all__ = ["OutlineGenerationService", "OUTLINE_GENERATION_SETTINGS"]
