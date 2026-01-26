# Security Fix Plan — 2025-01-26

**Source:** `specs/security/2025-01-26/SNYK_ANALYSIS_REPORT.md`
**Total Vulnerabilities:** 3 (1 Critical, 2 Low)

---

## 1) Backend — Critical (h11 HTTP Request Smuggling)

**Finding**
- Package: `h11@0.14.0` (transitive via `uvicorn@0.34.2`)
- Severity: Critical
- Snyk ID: `SNYK-PYTHON-H11-10293728`

**Plan**
1. **Pin h11 to 0.16.0** explicitly in `igad-app/backend/requirements.txt` (temporary mitigation if uvicorn still pulls 0.14.0).
2. **Upgrade uvicorn** to a version that pulls `h11>=0.16.0`.
3. **Rebuild backend dependencies** in the Python 3.11 venv.
4. **Verify** with `pip show h11` and `pip show uvicorn`.
5. **Regression checks**: start server + run core API smoke tests.
6. **Rescan Snyk** for backend.

**Commands**
```bash
cd igad-app/backend
# If needed, pin h11 in requirements.txt (temporary):
# h11==0.16.0

source venv/bin/activate
pip install --upgrade uvicorn
pip install -r requirements.txt --upgrade
pip show h11
pip show uvicorn

# Optional smoke test
python start_server.py
```

**Acceptance Criteria**
- `h11` version is `>=0.16.0`
- Snyk shows **0 critical** vulnerabilities in backend

---

## 2) Infrastructure — Low (aws-cdk-lib)

**Finding**
- Package: `aws-cdk-lib@2.187.0`
- Vulnerability: Incorrect Execution-Assigned Permissions
- Severity: Low
- Fix: upgrade to `aws-cdk-lib@2.189.1`
- Snyk ID: `SNYK-JS-AWSCDKLIB-9712558`

**Plan**
1. Update `igad-app/infrastructure/package.json` to `aws-cdk-lib: 2.189.1`.
2. Run `npm install`.
3. Run `npm run build` and `npm run synth`.
4. Deploy to testing and verify stacks.
5. Rescan Snyk for infrastructure.

**Commands**
```bash
cd igad-app/infrastructure
npm install aws-cdk-lib@2.189.1
npm install
npm run build
npm run synth
```

**Acceptance Criteria**
- `aws-cdk-lib@2.189.1` installed
- Snyk no longer reports `SNYK-JS-AWSCDKLIB-9712558`

---

## 3) Infrastructure — Low (brace-expansion ReDoS)

**Finding**
- Package: `brace-expansion@1.1.11` (transitive)
- Severity: Low
- Snyk ID: `SNYK-JS-BRACEEXPANSION-9789073`
- Fix: No direct patch available in current dependency chain

**Plan**
1. **Check if resolved** after upgrading `aws-cdk-lib` to `2.189.1`.
2. If still present:
   - Document as accepted low-risk transitive issue.
   - Monitor for upstream fixes in future CDK releases.

**Commands**
```bash
cd igad-app/infrastructure
npm list brace-expansion
```

**Acceptance Criteria**
- If still present, documented as accepted low-risk issue
- If resolved, Snyk shows no remaining infra vulnerabilities

---

## Suggested Implementation Order

1. **Backend Critical** (h11) — immediate
2. **Infrastructure Low** (aws-cdk-lib) — minor bump
3. **Infrastructure Low** (brace-expansion) — verify/monitor

---

## Verification Checklist

- [ ] Backend: `pip show h11` reports `>=0.16.0`
- [ ] Backend: Snyk clean (critical resolved)
- [ ] Infra: `aws-cdk-lib@2.189.1` installed
- [ ] Infra: `npm run synth` succeeds
- [ ] Snyk: no remaining critical/high; low documented

---

## Notes
- The frontend is already clean per the report.
- If uvicorn still pulls `h11@0.14.0`, keep the explicit `h11==0.16.0` pin until upstream resolves.
