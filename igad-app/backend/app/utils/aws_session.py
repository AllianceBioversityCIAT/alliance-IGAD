"""AWS session utility for handling different environments."""
import os

import boto3


def get_aws_session(region_name: str = "us-east-1") -> boto3.Session:
    """
    Get AWS session with appropriate credentials based on environment.

    In Lambda, uses default credentials (IAM role).
    In local development, uses IBD-DEV profile.
    """
    # Check if running in Lambda environment
    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        # Running in Lambda - temporarily remove AWS_PROFILE to avoid conflicts
        aws_profile = os.environ.pop("AWS_PROFILE", None)
        try:
            return boto3.Session(region_name=region_name)
        finally:
            # Restore AWS_PROFILE if it existed
            if aws_profile:
                os.environ["AWS_PROFILE"] = aws_profile
    else:
        # Running locally - use profile
        return boto3.Session(profile_name="IBD-DEV", region_name=region_name)


# Force update Tue Nov 11 16:34:33 -05 2025
