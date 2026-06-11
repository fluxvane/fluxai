# Security Policy

## Supported versions

The latest minor release on the `develop` branch receives security
updates. Older versions are not maintained.

| Version   | Supported |
| --------- | --------- |
| `develop` | ✅        |
| Older     | ❌        |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security
vulnerabilities.

Email security reports to: **security@fluxvane.example** (replace
with your real address before opening the PR). Include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to acknowledge reports within 3 business days.

## Scope

In scope:

- Authentication / authorization bypass
- SQL injection, XSS, CSRF
- Secret leakage (API keys, JWT secrets, database credentials)
- Remote code execution

Out of scope:

- Denial of service attacks against the demo deployment
- Issues in third-party dependencies (file upstream)
- Missing security headers that don't lead to exploitation
