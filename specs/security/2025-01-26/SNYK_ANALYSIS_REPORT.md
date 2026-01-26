# Snyk Security Analysis Report

**Generated:** 2024-12-19 (Updated)  
**Project:** Alliance IGAD  
**Snyk CLI Version:** 1.1301.0  
**Analysis Date:** Latest scan completed

## Executive Summary

This report contains the security vulnerability analysis results from Snyk for all components of the Alliance IGAD project.

**Total Vulnerabilities Found:** 3

- **Critical:** 1 (Backend)
- **Low:** 2 (Infrastructure)

**Status Update:** Frontend vulnerabilities resolved! The upgrade to `@tanstack/react-query@^5.0.0` eliminated all previously identified vulnerabilities.

---

## 1. Backend (Python) Analysis

**Location:** `igad-app/backend/`  
**Package Manager:** pip  
**Requirements File:** `requirements.txt`  
**Status:** ⚠️ **1 Critical Vulnerability Found**

### Vulnerabilities Found

#### Critical Severity

- **Package:** `h11@0.14.0`
- **Vulnerability:** HTTP Request Smuggling
- **Severity:** Critical
- **Introduced by:** `uvicorn@0.34.2 > h11@0.14.0`
- **Snyk Vulnerability ID:** [SNYK-PYTHON-H11-10293728](https://security.snyk.io/vuln/SNYK-PYTHON-H11-10293728)
- **Fix:** Pin `h11@0.14.0` to `h11@0.16.0`
- **Current uvicorn version constraint:** `>=0.30.0` (in requirements.txt)
- **Note:** Even uvicorn@0.34.2 includes the vulnerable h11@0.14.0. Need to upgrade to a version that uses h11@0.16.0+

### Recommended Actions

1. **Immediate Action Required:** Update the `h11` package dependency

   - The vulnerability is in `h11@0.14.0` which is a transitive dependency of `uvicorn`
   - **Current status:** Even `uvicorn@0.34.2` (within your `>=0.30.0` constraint) includes the vulnerable `h11@0.14.0`
   - **Action needed:** Update `uvicorn` to the latest version that includes `h11@0.16.0` or later
   - Check latest uvicorn version: `pip index versions uvicorn`
   - Consider pinning to a specific newer version (e.g., `uvicorn>=0.35.0` or latest)
   - Verify after update: `pip show uvicorn` and check its h11 dependency version

2. **Dependencies Tested:** 10 dependencies were analyzed

---

## 2. Frontend (Node.js) Analysis

**Location:** `igad-app/frontend/`  
**Package Manager:** npm  
**Package File:** `package.json`  
**Lock File:** `package-lock.json`  
**Status:** ✅ **No Vulnerabilities Found**

### Analysis Results

✅ **No vulnerabilities found!**

- **Dependencies Tested:** 144 dependencies were analyzed
- **Vulnerable Paths:** 0
- **Status:** All dependencies are secure

### Resolution Summary

The upgrade from `react-query@3.39.3` to `@tanstack/react-query@^5.0.0` successfully resolved the previous medium severity vulnerability:

- **Previous Issue:** `inflight@1.0.6` - Missing Release of Resource after Effective Lifetime
- **Resolution:** The new `@tanstack/react-query@^5.0.0` package uses updated dependencies that no longer include the vulnerable `inflight` package

### Key Dependencies (Current)

- **React:** ^18.2.0
- **React Router:** ^6.16.0
- **Axios:** ^1.5.0
- **@tanstack/react-query:** ^5.0.0 ✅ (upgraded and secure)
- **Vite:** ^4.4.5
- And 139+ other dependencies (all secure)

---

## 3. Infrastructure (Node.js) Analysis

**Location:** `igad-app/infrastructure/`  
**Package Manager:** npm  
**Package File:** `package.json`  
**Lock File:** `package-lock.json`  
**Status:** ⚠️ **2 Low Severity Vulnerabilities Found**

**Progress:** Reduced from 4 vulnerabilities (1 High, 1 Medium, 2 Low) to 2 Low severity vulnerabilities after upgrading `aws-cdk-lib` to 2.187.0

### Vulnerabilities Found

#### Low Severity

1. **Package:** `aws-cdk-lib@2.187.0`

   - **Vulnerability:** Incorrect Execution-Assigned Permissions
   - **Severity:** Low
   - **Introduced by:** `aws-cdk-lib@2.187.0`
   - **Snyk Vulnerability ID:** [SNYK-JS-AWSCDKLIB-9712558](https://security.snyk.io/vuln/SNYK-JS-AWSCDKLIB-9712558)
   - **Fix:** Upgrade `aws-cdk-lib@2.187.0` to `aws-cdk-lib@2.189.1`

2. **Package:** `brace-expansion@1.1.11`
   - **Vulnerability:** Regular Expression Denial of Service (ReDoS)
   - **Severity:** Low
   - **Introduced by:** `aws-cdk-lib@2.187.0 > minimatch@3.1.2 > brace-expansion@1.1.11`
   - **Snyk Vulnerability ID:** [SNYK-JS-BRACEEXPANSION-9789073](https://security.snyk.io/vuln/SNYK-JS-BRACEEXPANSION-9789073)
   - **Fix Status:** ⚠️ **No direct upgrade or patch available**
   - **Note:** Fixed in versions 1.1.12, 2.0.2, 3.0.1, 4.0.1 (transitive dependency, may be resolved in future aws-cdk-lib updates)

### Resolved Vulnerabilities (After Upgrade to 2.187.0)

✅ **Fixed:** High severity - Insertion of Sensitive Information into Log File  
✅ **Fixed:** Medium severity - Incorrect Default Permissions  
✅ **Fixed:** Low severity - Improper Verification of Cryptographic Signature

### Analysis Details

- **Dependencies Tested:** 40 dependencies were analyzed
- **Current Version:** `aws-cdk-lib@2.187.0` (upgraded from 2.100.0)
- **Vulnerable Paths:** 2 vulnerable dependency paths identified (down from 4)
- **Progress:** 50% reduction in vulnerabilities after upgrade

### Recommended Actions

1. **🟡 OPTIONAL: Upgrade AWS CDK Library (Minor Update)**

   - Update `aws-cdk-lib` from `2.187.0` to `2.189.1` to fix the remaining low severity vulnerability
   - Update `package.json`:
     ```json
     "aws-cdk-lib": "2.189.1"
     ```
   - Run `npm install` to update dependencies
   - This is a minor update and should have minimal breaking changes
   - Review AWS CDK changelog for any changes between 2.187.0 and 2.189.1

2. **Monitor brace-expansion Vulnerability**

   - The `brace-expansion@1.1.11` ReDoS vulnerability is a low-severity issue in a transitive dependency
   - No direct fix available, but it's low risk
   - Monitor for future `aws-cdk-lib` updates that may resolve this
   - Consider this acceptable risk given its low severity and transitive nature

3. **Testing After Upgrade (if upgrading to 2.189.1)**

   - Run `npm test` to ensure all tests pass
   - Run `cdk synth` to verify CDK synthesis works correctly
   - Review any deprecation warnings
   - Test deployment in a non-production environment first

### Key Dependencies Analyzed

- **AWS CDK:** 2.187.0 (✅ **Upgraded from 2.100.0** - Consider updating to 2.189.1 for latest fixes)
- **Constructs:** ^10.0.0
- **TypeScript:** ~5.2.2
- **Jest:** ^29.7.0

---

## Recommendations

### Immediate Actions

1. **🔴 CRITICAL: Fix Backend Vulnerability**

   - Update `uvicorn` from `0.24.0` to the latest version that includes `h11@0.16.0` or later
   - Check current latest version: `pip index versions uvicorn`
   - Update `requirements.txt` accordingly
   - Test the application after updating

2. **✅ FRONTEND: Vulnerabilities Resolved**

   - Frontend is now secure with no vulnerabilities found
   - The upgrade to `@tanstack/react-query@^5.0.0` successfully resolved all previous issues
   - Continue monitoring with regular Snyk scans

3. **🟡 INFRASTRUCTURE: Optional Minor Update**

   - Consider updating `aws-cdk-lib` from `2.187.0` to `2.189.1` to fix remaining low severity issue
   - Current vulnerabilities are low severity and acceptable for most use cases
   - Monitor for future updates that may resolve the transitive `brace-expansion` vulnerability

### Ongoing Security Practices

1. **Regular Scanning**

   - Run `snyk test` regularly (e.g., in CI/CD pipeline)
   - Set up Snyk monitoring: `snyk monitor` to track vulnerabilities over time

2. **Automated Checks**

   - Integrate Snyk into your CI/CD pipeline
   - Set up Snyk to fail builds on high/critical severity vulnerabilities

3. **Dependency Updates**

   - Regularly update dependencies to latest secure versions
   - Use `snyk test` before and after dependency updates

4. **Fix Vulnerabilities**
   - Prioritize critical and high severity vulnerabilities
   - Use `snyk wizard` for interactive vulnerability fixing
   - Use `snyk fix` to automatically apply patches where available

---

## Next Steps

1. 🔴 **Backend:** Fix the critical `h11` vulnerability (Update uvicorn to version with h11@0.16.0+)
2. ✅ **Frontend:** All vulnerabilities resolved - no action needed
3. 🟡 **Infrastructure:** Optional - Update `aws-cdk-lib` to 2.189.1 for latest fixes (low priority)
4. ⏳ **Integration:** Set up Snyk in CI/CD pipeline for continuous monitoring

## Summary Table

| Component                | Status        | Vulnerabilities | Severity Breakdown    |
| ------------------------ | ------------- | --------------- | --------------------- |
| Backend (Python)         | ⚠️ Vulnerable | 1               | 1 Critical            |
| Frontend (Node.js)       | ✅ Secure     | 0               | None                  |
| Infrastructure (Node.js) | 🟡 Low Risk   | 2               | 2 Low                 |
| **TOTAL**                | **⚠️**        | **3**           | **1 Critical, 2 Low** |

**Improvement:** Reduced from 6 vulnerabilities to 3 vulnerabilities (50% reduction). Frontend is now fully secure!

---

## Additional Resources

- [Snyk Documentation](https://docs.snyk.io/)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [Snyk CLI Commands](https://docs.snyk.io/snyk-cli/commands)

---

**Note:** This report was generated using Snyk CLI. For the most up-to-date vulnerability information and detailed remediation guidance, visit the Snyk dashboard or run `snyk test` with appropriate authentication.
