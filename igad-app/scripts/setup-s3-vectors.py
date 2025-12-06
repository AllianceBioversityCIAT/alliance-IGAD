#!/usr/bin/env python3
"""Manual S3 Vectors Infrastructure Setup"""
import boto3
import sys

def setup_s3_vectors():
    print("🎯 Setting up S3 Vectors Infrastructure...")
    print("Profile: IBD-DEV | Region: us-east-1\n")
    
    try:
        session = boto3.Session(profile_name='IBD-DEV', region_name='us-east-1')
        s3vectors = session.client('s3vectors')
        bucket_name = "igad-proposals-vectors-testing"
        
        # Create vector bucket
        print("📦 Vector Bucket")
        try:
            s3vectors.list_indexes(vectorBucketName=bucket_name)
            print(f"   ✅ '{bucket_name}' exists\n")
        except:
            print(f"   Creating '{bucket_name}'...")
            s3vectors.create_vector_bucket(
                vectorBucketName=bucket_name,
                encryptionConfiguration={'sseType': 'AES256'}
            )
            print(f"   ✅ Created\n")
        
        # Create indexes
        print("📊 Vector Indexes")
        indexes = [
            {'name': 'reference-proposals-index', 'desc': 'Reference proposals'},
            {'name': 'existing-work-index', 'desc': 'Existing work'}
        ]
        
        for idx in indexes:
            print(f"\n   {idx['name']}")
            try:
                s3vectors.get_index(vectorBucketName=bucket_name, indexName=idx['name'])
                print(f"   ✅ Exists")
            except:
                print(f"   Creating (1024 dim, cosine)...")
                # Configure metadata: only upload_date is non-filterable
                # All other keys (proposal_id, document_name, donor, sector, etc.) will be filterable
                metadata_config = {
                    'nonFilterableMetadataKeys': ['upload_date']
                }
                
                s3vectors.create_index(
                    vectorBucketName=bucket_name,
                    indexName=idx['name'],
                    dataType='float32',
                    dimension=1024,
                    distanceMetric='cosine',
                    metadataConfiguration=metadata_config
                )
                print(f"   ✅ Created")
        
        print("\n" + "="*60)
        print("✅ S3 Vectors Ready!")
        print("="*60)
        print("\nTest: POST /api/vectors/health\n")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        return False

if __name__ == '__main__':
    sys.exit(0 if setup_s3_vectors() else 1)
