#!/usr/bin/env python3
"""
Verify remaining vectors in S3 Vectors after cleanup
"""
import boto3
import json

s3vectors = boto3.client('s3vectors', region_name='us-east-1')
bucket_name = "igad-proposals-vectors-testing"
index_name = "reference-proposals-index"

print("=" * 80)
print("S3 VECTORS VERIFICATION - After Cleanup")
print("=" * 80)

# List all remaining vectors
response = s3vectors.list_vectors(
    vectorBucketName=bucket_name,
    indexName=index_name
)

vectors = response.get('vectors', [])

print(f"\n📊 Total vectors remaining: {len(vectors)}")

if len(vectors) == 0:
    print("\n✅ Index is now empty - ready for new uploads!")
else:
    print(f"\n📋 Remaining vectors:")
    print("=" * 80)

    for i, v in enumerate(vectors, 1):
        key = v['key']
        metadata = v.get('metadata', {})

        print(f"\n{i}. Key: {key}")

        # Check key format
        if key.startswith('PROP-') and '-chunk-' in key:
            print("   ✅ Format: CORRECT (PROP-...-chunk-N)")
        elif key.startswith('ref-'):
            print("   ⚠️  Format: OLD (ref-...)")
        else:
            print("   ❓ Format: UNKNOWN")

        # Check metadata
        if metadata:
            print(f"   📝 Metadata: {json.dumps(metadata, indent=6)}")
        else:
            print("   ❌ Metadata: EMPTY")

        print("-" * 80)

print("\n" + "=" * 80)
