"""
Knowledge Base Service

Provides retrieval from AWS Bedrock Knowledge Base for newsletter content.
Uses RAG (Retrieval-Augmented Generation) to fetch relevant content chunks
based on user-selected topics and configuration.

Features:
- Configurable query building from topics and config
- Relevance score filtering
- Dynamic retrieval parameters based on newsletter settings
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.utils.aws_session import get_aws_session

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    """Represents a retrieved content chunk from Knowledge Base."""

    chunk_id: str
    topic_id: str
    content: str
    score: float
    source_url: Optional[str] = None
    source_metadata: Optional[Dict[str, Any]] = None


# Valid information type IDs
VALID_TOPIC_IDS = [
    "breaking_news",
    "policy_updates",
    "food_security",
    "research_findings",
    "technology_innovation",
    "climate_smart",
    "market_access",
    "project_updates",
    "livestock",
    "funding",
    "events",
    "publications",
]

# Information types with display names
INFORMATION_TYPES = [
    {"id": "breaking_news", "name": "Breaking News & Updates", "category": "news"},
    {"id": "policy_updates", "name": "Policy Updates", "category": "news"},
    {"id": "food_security", "name": "Food Security Updates", "category": "news"},
    {
        "id": "research_findings",
        "name": "Research Findings",
        "category": "insights",
    },
    {
        "id": "technology_innovation",
        "name": "Technology & Innovation Spotlight",
        "category": "insights",
    },
    {
        "id": "climate_smart",
        "name": "Climate-Smart Agriculture",
        "category": "insights",
    },
    {"id": "market_access", "name": "Market Access & Trade", "category": "insights"},
    {
        "id": "project_updates",
        "name": "Project Updates & Success Stories",
        "category": "insights",
    },
    {
        "id": "livestock",
        "name": "Livestock & Animal Health",
        "category": "insights",
    },
    {
        "id": "funding",
        "name": "Funding Opportunities",
        "category": "opportunities",
    },
    {"id": "events", "name": "Events & Conferences", "category": "opportunities"},
    {
        "id": "publications",
        "name": "Publications & Resources",
        "category": "resources",
    },
]


class KnowledgeBaseService:
    """
    Service for retrieving content from AWS Bedrock Knowledge Base.

    Connects to the IGAD web scraping knowledge base to retrieve
    relevant content chunks for newsletter generation.
    """

    # Knowledge Base configuration
    KNOWLEDGE_BASE_ID = "NPDZSLKCYX"
    DEFAULT_MAX_RESULTS = 25
    DEFAULT_SCORE_THRESHOLD = 0.3  # Minimum relevance score

    def __init__(self) -> None:
        """
        Initialize Knowledge Base service with AWS session.

        Creates bedrock-agent-runtime client for retrieval operations.
        """
        session = get_aws_session()

        self.client = session.client(
            "bedrock-agent-runtime",
            region_name="us-east-1",
        )

        logger.info(
            f"✅ KnowledgeBaseService initialized with KB: {self.KNOWLEDGE_BASE_ID}"
        )

    def retrieve_content(
        self,
        query: str,
        max_results: int = DEFAULT_MAX_RESULTS,
        score_threshold: float = DEFAULT_SCORE_THRESHOLD,
    ) -> List[RetrievedChunk]:
        """
        Retrieve relevant content from Knowledge Base.

        Executes a vector similarity search against the knowledge base
        and returns matching content chunks filtered by score threshold.

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            score_threshold: Minimum relevance score (0-1)

        Returns:
            List of RetrievedChunk objects sorted by relevance

        Raises:
            Exception: If Knowledge Base retrieval fails
        """
        try:
            logger.info(
                f"📡 Retrieving from KB {self.KNOWLEDGE_BASE_ID}, "
                f"query length: {len(query)}, max_results: {max_results}"
            )

            response = self.client.retrieve(
                knowledgeBaseId=self.KNOWLEDGE_BASE_ID,
                retrievalQuery={"text": query},
                retrievalConfiguration={
                    "vectorSearchConfiguration": {
                        "numberOfResults": max_results,
                    }
                },
            )

            chunks = []
            results = response.get("retrievalResults", [])

            for i, result in enumerate(results):
                score = result.get("score", 0)

                # Filter by score threshold
                if score < score_threshold:
                    continue

                content = result.get("content", {}).get("text", "")
                location = result.get("location", {})

                # Build source URL from S3 location if available
                source_url = None
                s3_location = location.get("s3Location", {})
                if s3_location:
                    source_url = s3_location.get("uri")

                chunk = RetrievedChunk(
                    chunk_id=f"chunk-{i:03d}",
                    topic_id="",  # Set by caller based on query context
                    content=content,
                    score=score,
                    source_url=source_url,
                    source_metadata={
                        "type": location.get("type"),
                        "s3_uri": source_url,
                    },
                )
                chunks.append(chunk)

            logger.info(
                f"✅ Retrieved {len(chunks)} chunks "
                f"(filtered from {len(results)} results)"
            )

            return chunks

        except Exception as e:
            logger.error(f"❌ Knowledge Base retrieval failed: {e}")
            raise

    def build_query_from_topics(
        self,
        topics: List[str],
        config: Dict[str, Any],
    ) -> str:
        """
        Build optimized query from selected topics and configuration.

        Combines topic names with audience context, geographic focus,
        and tone-specific keywords to improve retrieval relevance.

        Args:
            topics: List of topic IDs to include
            config: Step 1 configuration with audience, tone, etc.

        Returns:
            Optimized query string for Knowledge Base search
        """
        query_parts = []

        # Get topic names
        topic_names = []
        for topic_id in topics:
            topic = next((t for t in INFORMATION_TYPES if t["id"] == topic_id), None)
            if topic:
                topic_names.append(topic["name"])

        if topic_names:
            query_parts.append(" ".join(topic_names))

        # Add audience context
        audiences = config.get("target_audience", [])
        if audiences:
            # Map audience IDs to readable context
            audience_context = {
                "researchers": "research scientific studies",
                "policy_makers": "policy governance regulations",
                "development_partners": "development projects programs",
                "ag_tech_industry": "technology innovation agriculture",
                "field_staff": "field implementation practical",
                "farmers": "farming agriculture practical",
                "myself": "",
            }
            audience_words = [
                audience_context.get(a, "")
                for a in audiences
                if audience_context.get(a)
            ]
            if audience_words:
                query_parts.append(" ".join(audience_words))

        # Add geographic focus
        geo_focus = config.get("geographic_focus", "IGAD region")
        if geo_focus:
            query_parts.append(geo_focus)

        # Add tone-based context
        tone = config.get("tone_preset", "industry_insight")
        tone_context = {
            "expert_analysis": "research data scientific studies technical analysis",
            "industry_insight": "analysis trends insights market developments",
            "friendly_summary": "practical applications success stories updates",
        }
        if tone in tone_context:
            query_parts.append(tone_context[tone])

        query = " ".join(query_parts)
        logger.info(f"📝 Built query: {query[:100]}...")

        return query

    def calculate_retrieval_params(
        self,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculate retrieval parameters based on Step 1 configuration.

        Determines optimal number of chunks and time window based on
        newsletter frequency and length preferences.

        Args:
            config: Step 1 configuration

        Returns:
            Dict with max_chunks and days_back parameters
        """
        # Base chunks by frequency
        frequency_params = {
            "daily": {"days_back": 2, "base_chunks": 15},
            "weekly": {"days_back": 14, "base_chunks": 25},
            "monthly": {"days_back": 45, "base_chunks": 40},
            "quarterly": {"days_back": 120, "base_chunks": 50},
        }

        # Length multipliers
        length_multipliers = {
            "quick_read": 0.6,
            "standard": 1.0,
            "deep_dive": 1.5,
        }

        frequency = config.get("frequency", "weekly")
        length = config.get("length_preference", "standard")

        base = frequency_params.get(frequency, frequency_params["weekly"])
        multiplier = length_multipliers.get(length, 1.0)

        max_chunks = int(base["base_chunks"] * multiplier)

        logger.info(
            f"📊 Retrieval params: frequency={frequency}, length={length}, "
            f"max_chunks={max_chunks}, days_back={base['days_back']}"
        )

        return {
            "days_back": base["days_back"],
            "max_chunks": max_chunks,
        }
