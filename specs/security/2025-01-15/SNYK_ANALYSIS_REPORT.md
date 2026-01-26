# Snyk Security Analysis Report

**Generated:** 2024-12-19  
**Project:** Alliance IGAD  
**Snyk CLI Version:** 1.1301.0

## Executive Summary

This report contains the security vulnerability analysis results from Snyk for all components of the Alliance IGAD project.

**Total Vulnerabilities Found:** 6

- **Critical:** 1 (Backend)
- **High:** 1 (Infrastructure)
- **Medium:** 2 (1 Frontend, 1 Infrastructure)
- **Low:** 2 (Infrastructure)

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
- **Introduced by:** `uvicorn@0.24.0 > h11@0.14.0`
- **Snyk Vulnerability ID:** [SNYK-PYTHON-H11-10293728](https://security.snyk.io/vuln/SNYK-PYTHON-H11-10293728)
- **Fix:** Pin `h11@0.14.0` to `h11@0.16.0`
- **Current uvicorn version:** 0.24.0 (in requirements.txt)

### Recommended Actions

1. **Immediate Action Required:** Update the `h11` package dependency

   - The vulnerability is in `h11@0.14.0` which is a transitive dependency of `uvicorn@0.24.0`
   - Update `uvicorn` to a newer version (latest stable) that includes `h11@0.16.0` or later
   - Check latest uvicorn version: `pip index versions uvicorn`
   - Alternatively, explicitly pin `h11>=0.16.0` in your requirements.txt (if supported by uvicorn)

2. **Dependencies Tested:** 10 dependencies were analyzed

---

## 2. Frontend (Node.js) Analysis

**Location:** `igad-app/frontend/`  
**Package Manager:** npm  
**Package File:** `package.json`  
**Lock File:** `package-lock.json`  
**Status:** ⚠️ **1 Medium Vulnerability Found**

### Vulnerabilities Found

#### Medium Severity

- **Package:** `inflight@1.0.6`
- **Vulnerability:** Missing Release of Resource after Effective Lifetime
- **Severity:** Medium
- **Introduced by:** `react-query@3.39.3 > broadcast-channel@3.7.0 > rimraf@3.0.2 > glob@7.2.3 > inflight@1.0.6`
- **Snyk Vulnerability ID:** [SNYK-JS-INFLIGHT-6095116](https://security.snyk.io/vuln/SNYK-JS-INFLIGHT-6095116)
- **Fix Status:** ⚠️ **No upgrade or patch available**

### Analysis Details

- **Dependencies Tested:** 165 dependencies were analyzed
- **Vulnerable Path:** Deep transitive dependency chain through react-query

### Recommended Actions

1. **Monitor for Updates**

   - This is a transitive dependency with no direct fix available
   - Monitor `react-query` for updates that may resolve this issue
   - Consider upgrading `react-query` to the latest version (v5.x) if compatible
   - The vulnerability is in an old, unmaintained package (`inflight@1.0.6`)

2. **Alternative Solutions**
   - Consider migrating from `react-query@3.39.3` to `@tanstack/react-query@5.x` (the new package name)
   - Review if `broadcast-channel` is necessary for your use case
   - Monitor Snyk for future patches or workarounds

### Key Dependencies Analyzed

- **React:** ^18.2.0
- **React Router:** ^6.16.0
- **Axios:** ^1.5.0
- **React Query:** ^3.39.3 (contains vulnerable transitive dependency)
- **Vite:** ^4.4.5
- And 160+ other dependencies

---

## 3. Infrastructure (Node.js) Analysis

**Location:** `igad-app/infrastructure/`  
**Package Manager:** npm  
**Package File:** `package.json`  
**Lock File:** `package-lock.json`  
**Status:** ⚠️ **4 Vulnerabilities Found**

### Vulnerabilities Found

#### High Severity

- **Package:** `aws-cdk-lib@2.100.0`
- **Vulnerability:** Insertion of Sensitive Information into Log File
- **Severity:** High
- **Introduced by:** `aws-cdk-lib@2.100.0`
- **Snyk Vulnerability ID:** [SNYK-JS-AWSCDKLIB-9576209](https://security.snyk.io/vuln/SNYK-JS-AWSCDKLIB-9576209)
- **Fix:** Upgrade `aws-cdk-lib@2.100.0` to `aws-cdk-lib@2.187.0`

#### Medium Severity

- **Package:** `aws-cdk-lib@2.100.0`
- **Vulnerability:** Incorrect Default Permissions
- **Severity:** Medium
- **Introduced by:** `aws-cdk-lib@2.100.0`
- **Snyk Vulnerability ID:** [SNYK-JS-AWSCDKLIB-9511702](https://security.snyk.io/vuln/SNYK-JS-AWSCDKLIB-9511702)
- **Fix:** Upgrade `aws-cdk-lib@2.100.0` to `aws-cdk-lib@2.187.0`

#### Low Severity

1. **Package:** `aws-cdk-lib@2.100.0`

   - **Vulnerability:** Improper Verification of Cryptographic Signature
   - **Severity:** Low
   - **Introduced by:** `aws-cdk-lib@2.100.0`
   - **Snyk Vulnerability ID:** [SNYK-JS-AWSCDKLIB-8647962](https://security.snyk.io/vuln/SNYK-JS-AWSCDKLIB-8647962)
   - **Fix:** Upgrade `aws-cdk-lib@2.100.0` to `aws-cdk-lib@2.187.0`

2. **Package:** `brace-expansion@1.1.11`
   - **Vulnerability:** Regular Expression Denial of Service (ReDoS)
   - **Severity:** Low
   - **Introduced by:** `aws-cdk-lib@2.100.0 > minimatch@3.1.2 > brace-expansion@1.1.11`
   - **Snyk Vulnerability ID:** [SNYK-JS-BRACEEXPANSION-9789073](https://security.snyk.io/vuln/SNYK-JS-BRACEEXPANSION-9789073)
   - **Fix Status:** ⚠️ **No direct upgrade or patch available**
   - **Note:** Fixed in versions 1.1.12, 2.0.2, 3.0.1, 4.0.1 (upgrading aws-cdk-lib may resolve this)

### Analysis Details

- **Dependencies Tested:** 39 dependencies were analyzed
- **Primary Issue:** Outdated `aws-cdk-lib` version (2.100.0 vs latest 2.187.0)
- **Vulnerable Paths:** 4 vulnerable dependency paths identified

### Recommended Actions

1. **🔴 HIGH PRIORITY: Upgrade AWS CDK Library**

   - Update `aws-cdk-lib` from `2.100.0` to `2.187.0` (or latest stable version)
   - This will fix 3 of the 4 vulnerabilities (High, Medium, and 1 Low severity)
   - Update `package.json`:
     ```json
     "aws-cdk-lib": "2.187.0"
     ```
   - Run `npm install` to update dependencies
   - Test infrastructure code for compatibility with the new CDK version
   - Review AWS CDK changelog for breaking changes between versions

2. **Monitor brace-expansion Vulnerability**

   - The `brace-expansion@1.1.11` ReDoS vulnerability may be resolved by upgrading `aws-cdk-lib`
   - If it persists, it's a low-severity issue in a transitive dependency
   - Monitor for updates to the dependency chain

3. **Testing After Upgrade**

   - Run `npm test` to ensure all tests pass
   - Run `cdk synth` to verify CDK synthesis works correctly
   - Review any deprecation warnings
   - Test deployment in a non-production environment first

### Key Dependencies Analyzed

- **AWS CDK:** 2.100.0 (⚠️ **OUTDATED - Update to 2.187.0**)
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

2. **🔴 HIGH: Fix Infrastructure Vulnerabilities**

   - Update `aws-cdk-lib` from `2.100.0` to `2.187.0` in `package.json`
   - This will fix 3 vulnerabilities (1 High, 1 Medium, 1 Low severity)
   - Run `npm install` and test infrastructure code
   - Review CDK changelog for breaking changes

3. **🟡 MEDIUM: Address Frontend Vulnerability**

   - Review the `inflight@1.0.6` vulnerability (no direct fix available)
   - Consider upgrading `react-query` to `@tanstack/react-query@5.x` if compatible
   - Monitor for updates to the dependency chain

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

1. 🔴 **Backend:** Fix the critical `h11` vulnerability (Update uvicorn)
2. 🔴 **Infrastructure:** Fix high severity vulnerability by upgrading `aws-cdk-lib` to 2.187.0
3. 🟡 **Frontend:** Review and address the medium severity `inflight` vulnerability
4. ⏳ **Integration:** Set up Snyk in CI/CD pipeline for continuous monitoring

## Summary Table

| Component                | Status        | Vulnerabilities | Severity Breakdown                      |
| ------------------------ | ------------- | --------------- | --------------------------------------- |
| Backend (Python)         | ⚠️ Vulnerable | 1               | 1 Critical                              |
| Frontend (Node.js)       | ⚠️ Vulnerable | 1               | 1 Medium                                |
| Infrastructure (Node.js) | ⚠️ Vulnerable | 4               | 1 High, 1 Medium, 2 Low                 |
| **TOTAL**                | **⚠️**        | **6**           | **1 Critical, 1 High, 2 Medium, 2 Low** |

---

## Additional Resources

- [Snyk Documentation](https://docs.snyk.io/)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [Snyk CLI Commands](https://docs.snyk.io/snyk-cli/commands)

---

**Note:** This report was generated using Snyk CLI. For the most up-to-date vulnerability information and detailed remediation guidance, visit the Snyk dashboard or run `snyk test` with appropriate authentication.
