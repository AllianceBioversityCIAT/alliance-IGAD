#!/usr/bin/env python3
"""
Delete ALL vectors from reference-proposals-index to start fresh
"""
import boto3

s3vectors = boto3.client('s3vectors', region_name='us-east-1')
bucket_name = "igad-proposals-vectors-testing"
index_name = "reference-proposals-index"

print("=" * 80)
print("DELETE ALL VECTORS - Reference Proposals Index")
print("=" * 80)

# List all vectors
response = s3vectors.list_vectors(
    vectorBucketName=bucket_name,
    indexName=index_name
)

vectors = response.get('vectors', [])
print(f"\n📊 Total vectors to delete: {len(vectors)}")

if len(vectors) == 0:
    print("\n✅ Index is already empty!")
else:
    keys = [v['key'] for v in vectors]

    print(f"\n🗑️  Deleting all {len(keys)} vectors...")

    # Delete in batches of 100
    batch_size = 100
    for i in range(0, len(keys), batch_size):
        batch = keys[i:i + batch_size]
        print(f"   Batch {i // batch_size + 1}: {len(batch)} vectors")

        s3vectors.delete_vectors(
            vectorBucketName=bucket_name,
            indexName=index_name,
            keys=batch
        )

    print(f"\n✅ All {len(keys)} vectors deleted!")

print("=" * 80)
