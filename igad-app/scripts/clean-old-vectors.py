#!/usr/bin/env python3
"""
Clean old vectors with empty metadata from S3 Vectors
"""
import boto3
import sys
import argparse

def clean_old_vectors(auto_confirm=False):
    """Delete all vectors with old key format (ref-uuid-...)"""

    s3vectors = boto3.client('s3vectors', region_name='us-east-1')
    bucket_name = "igad-proposals-vectors-testing"
    index_name = "reference-proposals-index"

    print("=" * 80)
    print("S3 VECTORS CLEANUP - Reference Proposals Index")
    print("=" * 80)

    # List all vectors
    print("\n🔍 Listing all vectors...")
    response = s3vectors.list_vectors(
        vectorBucketName=bucket_name,
        indexName=index_name
    )

    vectors = response.get('vectors', [])
    print(f"📊 Total vectors found: {len(vectors)}")

    # Find vectors with old format (ref-uuid-...)
    old_format_keys = []
    for v in vectors:
        key = v['key']
        if key.startswith('ref-'):
            old_format_keys.append(key)

    print(f"\n🗑️  Vectors to delete (old format): {len(old_format_keys)}")

    if not old_format_keys:
        print("✅ No old vectors to clean up!")
        return

    # Confirm deletion
    print("\n⚠️  This will DELETE the following vectors:")
    for i, key in enumerate(old_format_keys[:5], 1):
        print(f"   {i}. {key}")
    if len(old_format_keys) > 5:
        print(f"   ... and {len(old_format_keys) - 5} more")

    if not auto_confirm:
        confirm = input("\n❓ Continue with deletion? (yes/no): ")
        if confirm.lower() != 'yes':
            print("❌ Deletion cancelled")
            return
    else:
        print("\n✅ Auto-confirmed (--yes flag)")


    # Delete in batches of 100
    batch_size = 100
    deleted_count = 0

    for i in range(0, len(old_format_keys), batch_size):
        batch = old_format_keys[i:i + batch_size]

        print(f"\n🗑️  Deleting batch {i // batch_size + 1} ({len(batch)} vectors)...")

        try:
            s3vectors.delete_vectors(
                vectorBucketName=bucket_name,
                indexName=index_name,
                keys=batch
            )
            deleted_count += len(batch)
            print(f"   ✅ Deleted {len(batch)} vectors")
        except Exception as e:
            print(f"   ❌ Error deleting batch: {e}")
            continue

    print(f"\n" + "=" * 80)
    print(f"✅ CLEANUP COMPLETE")
    print(f"📊 Total deleted: {deleted_count} / {len(old_format_keys)}")
    print("=" * 80)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Clean old vectors from S3 Vectors')
    parser.add_argument('--yes', action='store_true', help='Auto-confirm deletion without prompting')
    args = parser.parse_args()

    try:
        clean_old_vectors(auto_confirm=args.yes)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
