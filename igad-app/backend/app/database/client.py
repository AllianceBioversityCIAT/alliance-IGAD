"""
DynamoDB client configuration for IGAD Innovation Hub
Single-table design with optimized access patterns
"""

import os
from typing import Any, Dict, List, Optional

import boto3
from aws_lambda_powertools import Logger
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = Logger()


class DynamoDBClient:
    """DynamoDB client with single-table design patterns"""

    def __init__(self):
        self.table_name = os.getenv("TABLE_NAME", "igad-testing-main-table")
        self.region = os.getenv("AWS_REGION", "us-east-1")

        # Initialize DynamoDB resource
        self.dynamodb = boto3.resource("dynamodb", region_name=self.region)
        self.table = self.dynamodb.Table(self.table_name)

        logger.info(f"DynamoDB client initialized for table: {self.table_name}")

    def get_item_sync(self, pk: str, sk: str) -> Optional[Dict[str, Any]]:
        """Get single item by primary key (synchronous for Lambda workers)"""
        try:
            response = self.table.get_item(Key={"PK": pk, "SK": sk})
            return response.get("Item")
        except ClientError as e:
            logger.error(f"Error getting item: {e}")
            raise

    def update_item_sync(
        self,
        pk: str,
        sk: str,
        update_expression: str,
        expression_attribute_values: Dict[str, Any],
        expression_attribute_names: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Update item with expression (synchronous for Lambda workers)"""
        try:
            kwargs = {
                "Key": {"PK": pk, "SK": sk},
                "UpdateExpression": update_expression,
                "ExpressionAttributeValues": expression_attribute_values,
                "ReturnValues": "ALL_NEW",
            }

            if expression_attribute_names:
                kwargs["ExpressionAttributeNames"] = expression_attribute_names

            response = self.table.update_item(**kwargs)
            return response.get("Attributes", {})
        except ClientError as e:
            logger.error(f"Error updating item: {e}")
            raise

    async def get_item(self, pk: str, sk: str) -> Optional[Dict[str, Any]]:
        """Get single item by primary key"""
        try:
            response = self.table.get_item(Key={"PK": pk, "SK": sk})
            return response.get("Item")
        except ClientError as e:
            logger.error(f"Error getting item: {e}")
            raise

    async def put_item(self, item: Dict[str, Any]) -> bool:
        """Put single item"""
        try:
            self.table.put_item(Item=item)
            logger.info(f"Item created: PK={item.get('PK')}, SK={item.get('SK')}")
            return True
        except ClientError as e:
            logger.error(f"Error putting item: {e}")
            raise

    async def update_item(
        self,
        pk: str,
        sk: str,
        update_expression: str,
        expression_attribute_values: Dict[str, Any],
        expression_attribute_names: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Update item with expression"""
        try:
            kwargs = {
                "Key": {"PK": pk, "SK": sk},
                "UpdateExpression": update_expression,
                "ExpressionAttributeValues": expression_attribute_values,
                "ReturnValues": "ALL_NEW",
            }

            if expression_attribute_names:
                kwargs["ExpressionAttributeNames"] = expression_attribute_names

            response = self.table.update_item(**kwargs)
            return response.get("Attributes", {})
        except ClientError as e:
            logger.error(f"Error updating item: {e}")
            raise

    async def delete_item(self, pk: str, sk: str) -> bool:
        """Delete single item"""
        try:
            self.table.delete_item(Key={"PK": pk, "SK": sk})
            logger.info(f"Item deleted: PK={pk}, SK={sk}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting item: {e}")
            raise

    async def query_items(
        self,
        pk: str,
        sk_condition: Optional[str] = None,
        index_name: Optional[str] = None,
        limit: Optional[int] = None,
        scan_index_forward: bool = True,
        pk_name: Optional[str] = None,
        sk_begins_with: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query items by partition key with pagination support"""
        try:
            # Determine the partition key name based on index
            if pk_name:
                partition_key_name = pk_name
            elif index_name == "GSI1":
                partition_key_name = "GSI1PK"
            else:
                partition_key_name = "PK"

            # Determine sort key name based on index
            if index_name == "GSI1":
                sort_key_name = "GSI1SK"
            else:
                sort_key_name = "SK"

            kwargs = {"KeyConditionExpression": Key(partition_key_name).eq(pk)}

            if sk_condition:
                kwargs["KeyConditionExpression"] &= sk_condition

            # Support sk_begins_with for filtering by sort key prefix
            if sk_begins_with:
                kwargs["KeyConditionExpression"] &= Key(sort_key_name).begins_with(
                    sk_begins_with
                )

            if index_name:
                kwargs["IndexName"] = index_name

            if limit:
                kwargs["Limit"] = limit

            kwargs["ScanIndexForward"] = scan_index_forward

            # Handle pagination - collect all items
            all_items = []
            response = self.table.query(**kwargs)
            all_items.extend(response.get("Items", []))

            # Continue fetching if there are more items (unless limit is set)
            while "LastEvaluatedKey" in response and not limit:
                kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
                response = self.table.query(**kwargs)
                all_items.extend(response.get("Items", []))

            return all_items
        except ClientError as e:
            logger.error(f"Error querying items: {e}")
            raise

    async def batch_get_items(self, keys: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Batch get multiple items"""
        try:
            response = self.dynamodb.batch_get_item(
                RequestItems={self.table_name: {"Keys": keys}}
            )
            return response.get("Responses", {}).get(self.table_name, [])
        except ClientError as e:
            logger.error(f"Error batch getting items: {e}")
            raise

    async def batch_write_items(self, items: List[Dict[str, Any]]) -> bool:
        """Batch write multiple items"""
        try:
            with self.table.batch_writer() as batch:
                for item in items:
                    batch.put_item(Item=item)

            logger.info(f"Batch write completed: {len(items)} items")
            return True
        except ClientError as e:
            logger.error(f"Error batch writing items: {e}")
            raise

    async def scan_table(
        self, filter_expression=None, limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Scan entire table (use sparingly, prefer query when possible)"""
        try:
            kwargs = {}

            if filter_expression:
                kwargs["FilterExpression"] = filter_expression

            if limit:
                kwargs["Limit"] = limit

            response = self.table.scan(**kwargs)
            items = response.get("Items", [])

            # Handle pagination if needed
            while "LastEvaluatedKey" in response:
                kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
                response = self.table.scan(**kwargs)
                items.extend(response.get("Items", []))

            logger.info(f"Scanned table: {len(items)} items found")
            return items
        except ClientError as e:
            logger.error(f"Error scanning table: {e}")
            raise

    async def scan_items(
        self,
        filter_expression: str,
        expression_attribute_values: Dict[str, Any],
        expression_attribute_names: Optional[Dict[str, str]] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Scan table with filter expression string and attribute values.
        Use sparingly - prefer query when possible.
        Useful for eventual consistency fallback when GSI hasn't replicated yet.
        """
        try:
            from boto3.dynamodb.conditions import Attr

            # Build filter expression from string conditions
            # Parse simple "field = :value AND field2 = :value2" format
            conditions = None
            parts = filter_expression.split(" AND ")

            for part in parts:
                part = part.strip()
                if " = " in part:
                    field, placeholder = part.split(" = ")
                    field = field.strip()
                    placeholder = placeholder.strip()
                    value = expression_attribute_values.get(placeholder)

                    condition = Attr(field).eq(value)
                    if conditions is None:
                        conditions = condition
                    else:
                        conditions = conditions & condition

            kwargs = {}
            if conditions:
                kwargs["FilterExpression"] = conditions

            if limit:
                kwargs["Limit"] = limit

            response = self.table.scan(**kwargs)
            items = response.get("Items", [])

            # For fallback scans with limit, we don't need full pagination
            # Just return first batch that matches
            if limit and len(items) >= limit:
                return items[:limit]

            return items
        except ClientError as e:
            logger.error(f"Error scanning items: {e}")
            raise


# Global client instance
db_client = DynamoDBClient()
