"""Reference Proposals Analysis configuration"""

REFERENCE_PROPOSALS_ANALYSIS_SETTINGS = {
    "max_documents": 3,  # Maximum number of reference proposals to analyze
    "max_chars_per_document": 100000,  # Max characters per document (~25K tokens)
    "timeout": 120,  # 2 minutes timeout (Haiku is fast)
    "model": "us.anthropic.claude-3-5-haiku-20241022-v1:0",  # Claude 3.5 Haiku with cross-region inference
}
