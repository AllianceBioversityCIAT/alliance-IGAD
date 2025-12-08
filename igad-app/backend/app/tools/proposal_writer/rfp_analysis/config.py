"""RFP Analysis configuration"""

RFP_ANALYSIS_SETTINGS = {
    "max_pages": 100,
    "timeout": 300,
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "max_tokens": 12000,  # Maximum tokens for Claude response
    "temperature": 0.2,   # Low temperature for consistent, factual analysis
    "max_chars": 50000    # Maximum characters from RFP before truncation
}
