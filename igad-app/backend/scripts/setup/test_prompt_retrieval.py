#!/usr/bin/env python3
"""
Test RFP Prompt Retrieval System
Verifies that the enhanced prompt management system works correctly
"""

import asyncio
import os
import sys

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.rfp_analysis_service import RFPAnalysisService  # noqa: E402


async def test_prompt_retrieval():
    """Test the prompt retrieval system with different scenarios"""

    analysis_service = RFPAnalysisService()

    print("=== Testing RFP Prompt Retrieval System ===\n")

    # Test scenarios
    test_cases = [
        {"name": "General RFP Analysis", "sector": None, "categories": None},
        {
            "name": "Livestock Sector Analysis",
            "sector": "livestock",
            "categories": None,
        },
        {"name": "Climate Security Analysis", "sector": "climate", "categories": None},
        {
            "name": "Agriculture Sector Analysis",
            "sector": "agriculture",
            "categories": None,
        },
        {"name": "Research Sector Analysis", "sector": "research", "categories": None},
        {
            "name": "Unknown Sector (should fallback)",
            "sector": "unknown_sector",
            "categories": None,
        },
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"{i}. Testing: {test_case['name']}")

        try:
            prompt_template = await analysis_service.get_analysis_prompt(
                sector=test_case["sector"], categories=test_case["categories"]
            )

            if prompt_template:
                print(
                    f"   ✓ Retrieved prompt: {prompt_template.get('prompt_name', 'Unknown')}"
                )
                print(f"   ✓ Prompt ID: {prompt_template.get('prompt_id')}")
                print(f"   ✓ Categories: {prompt_template.get('categories', [])}")
                print(f"   ✓ Tags: {prompt_template.get('tags', [])}")

                # Check if system prompt contains expected content
                system_prompt = prompt_template.get("system_prompt", "")
                if (
                    test_case["sector"] == "livestock"
                    and "livestock" in system_prompt.lower()
                ):
                    print("   ✓ Sector-specific content detected")
                elif (
                    test_case["sector"] == "climate"
                    and "climate" in system_prompt.lower()
                ):
                    print("   ✓ Sector-specific content detected")
                elif test_case["sector"] is None and "igad" in system_prompt.lower():
                    print("   ✓ General IGAD content detected")
                else:
                    print("   ⚠ Content check inconclusive")

            else:
                print("   ✗ No prompt retrieved (fallback should have been used)")

        except Exception as e:
            print(f"   ✗ Error: {e}")

        print()

    # Test sector detection
    print("=== Testing Sector Detection ===\n")

    test_content_samples = [
        {
            "content": "This project focuses on livestock development and pastoral communities in northern Kenya. The initiative will improve cattle and goat production systems.",
            "expected": "livestock",
        },
        {
            "content": "Climate change adaptation and drought resilience are key priorities. This research will analyze climate security nexus in the Horn of Africa.",
            "expected": "climate",
        },
        {
            "content": "Agricultural development and crop production systems will be enhanced through this farming initiative targeting smallholder farmers.",
            "expected": "agriculture",
        },
        {
            "content": "This is a general development project with no specific sector focus mentioned in the description.",
            "expected": None,
        },
    ]

    for i, test_sample in enumerate(test_content_samples, 1):
        print(f"{i}. Testing sector detection:")
        print(f"   Content: {test_sample['content'][:100]}...")

        detected_sector = analysis_service.detect_sector_from_content(
            test_sample["content"]
        )
        expected_sector = test_sample["expected"]

        if detected_sector == expected_sector:
            print(f"   ✓ Correctly detected: {detected_sector}")
        else:
            print(f"   ⚠ Expected: {expected_sector}, Got: {detected_sector}")

        print()

    print("=== Test Complete ===")


if __name__ == "__main__":
    asyncio.run(test_prompt_retrieval())
