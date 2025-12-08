"""Existing Work Analysis configuration"""

EXISTING_WORK_ANALYSIS_SETTINGS = {
    "max_documents": 3,  # Maximum number of existing work documents to analyze
    "max_chars_per_document": 100000,  # Max characters per document (~25K tokens)
    "timeout": 120,  # 2 minutes timeout (Haiku is fast)
    "model": "us.anthropic.claude-3-5-haiku-20241022-v1:0",  # Claude 3.5 Haiku with cross-region inference
    "max_tokens": 8000,  # Maximum tokens for Claude response
    "temperature": 0.3,  # Slightly higher for more diverse pattern identification
}
