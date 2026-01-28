# DynamoDB History Tracking System

## 📋 Overview

Complete history system to track all operations in DynamoDB, especially designed to prevent data loss like prompts 1.1 and 1.2.

## 🎯 Features

- ✅ **Automatic tracking** of CREATE, UPDATE, DELETE, READ operations
- ✅ **Before/after states** for complete auditing
- ✅ **User information** and timestamp
- ✅ **REST API** to query history
- ✅ **Automatic cleanup** of old records
- ✅ **Simple decorator** for easy integration

## 🏗️ Data Structure

### History Record
```json
{
  "PK": "HISTORY#PROMPT#prompt-id",
  "SK": "OPERATION#2025-12-16T20:30:00Z#DELETE",
  "history_id": "2025-12-16T20:30:00Z#DELETE#prompt-id",
  "operation_type": "DELETE",
  "resource_type": "PROMPT",
  "resource_id": "prompt-id",
  "timestamp": "2025-12-16T20:30:00Z",
  "user_id": "admin@igad.org",
  "before_state": {
    "name": "Prompt 1.1",
    "version": "1.1",
    "status": "active"
  },
  "after_state": null,
  "metadata": {
    "function": "delete_prompt",
    "success": true
  }
}
```

## 🚀 Quick Usage

### 1. With Decorator (Recommended)
```python
from app.shared.database.history_decorator import track_history

@track_history(
    resource_type="PROMPT",
    get_resource_id=lambda args, kwargs: args[0],  # first argument
    get_user_id=lambda args, kwargs: kwargs.get("user_id", "system")
)
def delete_prompt(prompt_id: str, user_id: str = None):
    # Your existing logic here
    pass
```

### 2. Manual (For Full Control)
```python
from app.shared.database.history_service import history_service

# Before operation
before_state = get_current_prompt_state(prompt_id)

# Perform operation
result = delete_prompt_from_db(prompt_id)

# Log to history
history_service.log_operation(
    operation_type="DELETE",
    resource_type="PROMPT",
    resource_id=prompt_id,
    user_id="admin@igad.org",
    before_state=before_state,
    metadata={"reason": "cleanup"}
)
```

## 📡 API Endpoints

### View Resource History
```bash
GET /api/history/resource/PROMPT/prompt-1.1?limit=50
```

### View Recent Operations
```bash
GET /api/history/recent?resource_type=PROMPT&limit=100
```

### Statistics
```bash
GET /api/history/stats
```

### Cleanup Old History
```bash
POST /api/history/cleanup?days_to_keep=90
```

## 🔧 Integration in Existing Services

### Step 1: Import the Decorator
```python
from app.shared.database.history_decorator import track_history
```

### Step 2: Apply to Critical Functions
```python
@track_history("PROMPT", get_resource_id=lambda args, kwargs: args[0])
def create_prompt(prompt_id, data):
    # Existing code unchanged
    pass

@track_history("PROMPT", get_resource_id=lambda args, kwargs: args[0])
def update_prompt(prompt_id, updates):
    # Existing code unchanged
    pass

@track_history("PROMPT", get_resource_id=lambda args, kwargs: args[0])
def delete_prompt(prompt_id):
    # Existing code unchanged
    pass
```

## 🔍 Use Cases

### 1. Investigate Mysterious Deletions
```python
# View history of a specific prompt
history = history_service.get_resource_history("PROMPT", "prompt-1.1")

for record in history:
    if record["operation_type"] == "DELETE":
        print(f"Deleted by: {record['user_id']}")
        print(f"Date: {record['timestamp']}")
        print(f"State before: {record['before_state']}")
```

### 2. Audit Changes
```python
# View all recent operations
recent = history_service.get_recent_operations("PROMPT", limit=100)

for record in recent:
    print(f"{record['timestamp']}: {record['operation_type']} by {record['user_id']}")
```

### 3. Recover Lost Data
```python
# Find last state before deletion
history = history_service.get_resource_history("PROMPT", "prompt-1.1")
delete_record = next(r for r in history if r["operation_type"] == "DELETE")
last_state = delete_record["before_state"]

# Use last_state to recreate the prompt
```

## ⚙️ Configuration

### Environment Variables
```bash
TABLE_NAME=igad-testing-main-table  # Main DynamoDB table
```

### Automatic Cleanup (Optional)
```python
# In a cron job or scheduled Lambda
history_service.cleanup_old_history(days_to_keep=90)
```

## 🛡️ Security

- **Sensitive Data**: Automatically redacted (passwords, tokens, etc.)
- **Size Limit**: Long texts are automatically truncated
- **Access Control**: Only authorized users can view history

## 📊 Monitoring

### Statistics Dashboard
```bash
curl GET /api/history/stats
```

Response:
```json
{
  "total_operations": 1250,
  "operation_types": {
    "CREATE": 400,
    "UPDATE": 600,
    "DELETE": 200,
    "READ": 50
  },
  "resource_types": {
    "PROMPT": 800,
    "PROPOSAL": 450
  },
  "top_users": {
    "admin@igad.org": 500,
    "user@igad.org": 300
  }
}
```

## 🚨 Recommended Alerts

1. **Mass Deletions**: > 10 DELETE in 1 hour
2. **Suspicious User**: > 100 operations per user/day
3. **Frequent Failures**: > 5% failed operations

## 🔄 Migration

For existing services:

1. **Install**: Copy history system files
2. **Import**: Add necessary imports
3. **Decorate**: Apply `@track_history` to critical functions
4. **Test**: Verify history is recorded correctly
5. **Monitor**: Use API to verify operation

## 📝 Complete Example

See `service_with_history.py` for a complete integration example.

## ❓ Troubleshooting

### Problem: History not recording
- Verify `TABLE_NAME` is configured
- Check DynamoDB permissions
- Review application logs

### Problem: Too many history records
- Configure automatic cleanup
- Adjust `days_to_keep` as needed
- Consider archiving to S3 for very old history

### Problem: Performance impact
- History is recorded asynchronously
- If issues occur, history fails silently without affecting the main operation
- Consider using DynamoDB Streams for real-time history
