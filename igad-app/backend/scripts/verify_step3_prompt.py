"""
Script to verify Step 3 prompt placeholders in DynamoDB.

Run from backend directory:
    python scripts/verify_step3_prompt.py

Requires AWS credentials and TABLE_NAME environment variable.
"""
import os
import boto3
from boto3.dynamodb.conditions import Attr

# Configuration
TABLE_NAME = os.environ.get("TABLE_NAME", "igad-testing-main-table")
REQUIRED_PLACEHOLDERS = [
    "{{rfp_analysis}}",
    "{{concept_document_v2}}",
    "{{reference_proposals_analysis}}",
    "{{existing_work_analysis}}"
]

def verify_prompt():
    print(f"🔍 Searching for Step 3 prompt in table: {TABLE_NAME}")
    print(f"   Criteria: section='proposal_writer', sub_section='step-3', categories contains 'Initial Proposal'")
    print()

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(TABLE_NAME)

    response = table.scan(
        FilterExpression=(
            Attr("is_active").eq(True)
            & Attr("section").eq("proposal_writer")
            & Attr("sub_section").eq("step-3")
            & Attr("categories").contains("Initial Proposal")
        )
    )

    items = response.get("Items", [])

    if not items:
        print("❌ No prompt found matching criteria!")
        print("   Please create a prompt in the Prompt Manager with:")
        print("   - section: proposal_writer")
        print("   - sub_section: step-3")
        print("   - categories: ['Initial Proposal']")
        print("   - is_active: true")
        return False

    print(f"✅ Found {len(items)} prompt(s)")

    for i, item in enumerate(items):
        print(f"\n{'='*60}")
        print(f"📋 Prompt {i+1}: {item.get('name', 'Unnamed')}")
        print(f"   ID: {item.get('pk', 'N/A')}")
        print(f"   Version: {item.get('version', 'N/A')}")
        print(f"   Categories: {item.get('categories', [])}")
        print(f"{'='*60}")

        user_prompt = item.get("user_prompt_template", "")

        print(f"\n🔎 Checking placeholders in user_prompt_template:")
        print(f"   Template length: {len(user_prompt)} characters")

        all_found = True
        for placeholder in REQUIRED_PLACEHOLDERS:
            found = placeholder in user_prompt
            status = "✅" if found else "❌ MISSING"
            print(f"   {status} {placeholder}")
            if not found:
                all_found = False

        if all_found:
            print(f"\n✅ All required placeholders found!")
        else:
            print(f"\n⚠️  Some placeholders are MISSING. Please update the prompt.")
            print(f"   The prompt needs these placeholders for Step 3 to work correctly.")

        # Show a preview of the template
        print(f"\n📄 Template preview (first 500 chars):")
        print(f"   {user_prompt[:500]}...")

    return all_found


if __name__ == "__main__":
    try:
        verify_prompt()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
