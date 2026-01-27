# 🧹 CLEANUP OLD STRUCTURE - INSTRUCTIONS FOR KIRO

## Context
The migration to Screaming Architecture is complete and tested successfully in production. Now we need to remove the old directory structure.

## ✅ Verified Working
- ✅ New structure deployed and tested
- ✅ All endpoints working correctly
- ✅ Imports updated and functional

## 🎯 Task: Remove Old Directory Structure

### Backend Files to Remove

```bash
# Navigate to backend directory
cd igad-app/backend/app/

# Remove old directories
rm -rf routers/
rm -rf services/
rm -rf workers/
rm -rf models/
```

### Specific Files to Remove:

**Old routers/ directory:**
- `routers/proposals.py` (now in `tools/proposal_writer/routes.py`)

**Old services/ directory:**
- `services/simple_rfp_analyzer.py` → now in `tools/proposal_writer/rfp_analysis/service.py`
- `services/simple_concept_analyzer.py` → now in `tools/proposal_writer/concept_evaluation/service.py`
- `services/concept_document_generator.py` → now in `tools/proposal_writer/document_generation/service.py`
- `services/bedrock_service.py` → now in `shared/ai/bedrock_service.py`
- `services/cognito_service.py` → now in `tools/auth/service.py`
- `services/prompt_service.py` → now in `tools/admin/prompts_manager/service.py`

**Old workers/ directory:**
- `workers/analysis_worker.py` → now in `tools/proposal_writer/workflow/worker.py`

**Old models/ directory:**
- Can be removed if empty or moved to appropriate tool directories

## ⚠️ IMPORTANT: DO NOT REMOVE

Keep these files/directories:
- ✅ `tools/` - New structure
- ✅ `shared/` - Common resources
- ✅ `main.py` - Entry point (already updated)
- ✅ `__init__.py` files

## 🔍 Verification After Cleanup

After removing old files, verify:

```bash
# Check that old directories are gone
ls -la igad-app/backend/app/

# Should only see:
# - tools/
# - shared/
# - main.py
# - __init__.py
```

## 📋 Execution Steps

1. **Backup first** (just in case):
   ```bash
   cd igad-app/backend/app/
   tar -czf old_structure_backup_$(date +%Y%m%d_%H%M%S).tar.gz routers/ services/ workers/ models/
   mv old_structure_backup_*.tar.gz ~/backups/
   ```

2. **Remove old directories**:
   ```bash
   rm -rf routers/
   rm -rf services/
   rm -rf workers/
   rm -rf models/
   ```

3. **Verify clean structure**:
   ```bash
   tree -L 2 igad-app/backend/app/
   ```

4. **Test locally**:
   ```bash
   cd igad-app/backend
   sam build
   sam local start-api
   ```

5. **If everything works**, remove the backup:
   ```bash
   rm ~/backups/old_structure_backup_*.tar.gz
   ```

## ✅ Expected Final Structure

```
igad-app/backend/app/
├── tools/
│   ├── __init__.py
│   ├── proposal_writer/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── rfp_analysis/
│   │   ├── concept_evaluation/
│   │   ├── document_generation/
│   │   └── workflow/
│   ├── auth/
│   └── admin/
├── shared/
│   ├── __init__.py
│   ├── ai/
│   ├── database/
│   └── config/
└── main.py
```

## 🚀 Ready to Execute

KIRO, please execute this cleanup following the steps above.

---

**Created:** 2025-01-24
**Status:** Ready for execution
**Risk Level:** Low (production already tested and working)
