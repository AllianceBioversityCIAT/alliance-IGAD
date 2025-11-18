# Alliance IGAD - Current Status
**Last Updated:** November 18, 2025 - 19:44 EST

---

## 📍 Current Session

Working on: **RFP Analysis & Document Management**

See: [SESSION_NOV18_EVENING.md](./SESSION_NOV18_EVENING.md) for detailed documentation.

---

## ✅ What's Working

### Proposal Writer - Step 1 (Information Consolidation)
- ✅ Auto-create proposal draft on entry
- ✅ Upload RFP PDF to S3
- ✅ Upload reference proposals
- ✅ Enter existing work (text)
- ✅ Enter initial concept (text)
- ✅ Delete documents (S3 + DynamoDB cleanup)
- ✅ LocalStorage persistence
- ✅ Draft confirmation modal on exit

### Proposal Writer - Step 2 (Concept Review)
- ✅ Display RFP Analysis Results
  - Summary (title, donor, deadline, budget)
  - Geographic scope
  - Target beneficiaries
  - Deliverables
  - Mandatory requirements
  - Evaluation criteria

### RFP Analysis Backend
- ✅ Extract text from PDF (PyPDF2)
- ✅ Get prompt from DynamoDB
- ✅ Send to Bedrock (Claude 3.5 Sonnet)
- ✅ Save analysis to DynamoDB
- ✅ Async processing with polling
- ✅ Status endpoint for frontend polling

### Document Deletion
- ✅ Delete from S3 bucket
- ✅ Remove from DynamoDB metadata
- ✅ Clear RFP analysis when RFP deleted
- ✅ Event-driven UI updates

---

## 🔧 In Progress / Debugging

### RFP Analysis Trigger
- ❓ Testing "Analyze & Continue" button flow
- ❓ Verifying polling mechanism
- ✅ Added comprehensive debug logging

**Debug Logs Added:**
- 🔵 Function entry points
- 🟢 Analysis start
- 📡 API calls
- ⏳ Polling status
- ✅ Success states
- ❌ Error states

**Next Action:** Test the flow and review console logs.

---

## 📂 Project Structure

```
alliance-IGAD/
├── SESSION_NOV18_EVENING.md     ← Current session (detailed)
├── README.md                     ← Project overview
├── docs/
│   └── archive/                  ← Old documentation
│       ├── CURRENT_STATUS.md
│       ├── SESSION_SUMMARY.md
│       ├── TODAYS_WORK.md
│       └── WORK_NOV18.md
└── igad-app/
    ├── frontend/                 ← React + TypeScript + Vite
    │   └── src/
    │       ├── pages/proposalWriter/
    │       │   ├── ProposalWriterPage.tsx
    │       │   ├── Step1InformationConsolidation.tsx
    │       │   ├── Step2ContentGeneration.tsx
    │       │   └── components/
    │       │       └── RFPAnalysisResults.tsx
    │       └── services/
    │           └── proposalService.ts
    └── backend/                  ← FastAPI + AWS Lambda
        └── app/
            ├── routers/
            │   ├── proposals.py
            │   └── documents.py
            └── services/
                └── simple_rfp_analyzer.py
```

---

## 🎯 User Flow

```
1. User goes to /proposal-writer
   └─→ Auto-create draft proposal
   
2. Step 1: Upload RFP + Enter Info
   └─→ Click "Analyze & Continue"
        ├─→ Modal shows "Analyzing RFP..."
        ├─→ Backend extracts text + sends to Bedrock
        └─→ Frontend polls for completion
   
3. Step 2: View RFP Analysis + Review Concept
   └─→ See analyzed RFP data
   └─→ Continue with concept review
```

---

## 🔗 Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/proposals` | Create draft proposal |
| GET | `/api/proposals/{id}` | Get proposal details |
| PUT | `/api/proposals/{id}` | Update proposal |
| DELETE | `/api/proposals/{id}` | Delete proposal + S3 folder |
| POST | `/api/proposals/{id}/documents/upload` | Upload PDF to S3 |
| DELETE | `/api/proposals/{id}/documents/{filename}` | Delete doc from S3 + clear analysis |
| POST | `/api/proposals/{id}/analyze-rfp` | Start RFP analysis (async) |
| GET | `/api/proposals/{id}/analysis-status` | Poll analysis status |

---

## 💾 Data Storage

### DynamoDB Table: `IGADProposalsTable`
- **PK:** `PROPOSAL#{proposalCode}`
- **SK:** `METADATA`
- **GSI1:** `USER#{user_id}` (for user queries)

### S3 Bucket: `igad-proposal-documents-{account-id}`
- **Structure:** `{proposalCode}/documents/{filename}.pdf`

### LocalStorage:
- `proposal_draft_{proposalId}` - Form data
- `proposal_rfp_analysis_{proposalId}` - Analysis results

---

## 📚 Archive

Old documentation moved to: `docs/archive/`

---

## 🚀 Quick Start

### Run Frontend:
```bash
cd igad-app/frontend
npm run dev
```

### Deploy Backend:
```bash
cd igad-app
./scripts/deploy-fullstack-testing.sh
```

---

**For detailed session notes, see:** [SESSION_NOV18_EVENING.md](./SESSION_NOV18_EVENING.md)
