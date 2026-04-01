# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main`  | ✅        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email **security@opensourcecommunity.io** with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact assessment

We aim to respond within 48 hours and release a patch within 7 days for critical issues. We will credit reporters in the release notes unless you prefer to remain anonymous.

## Scope

In-scope vulnerabilities include:
- SQL injection or RLS bypass in the Drizzle query layer
- Authentication bypass or token forgery in the Hono auth middleware
- Cross-tenant data leakage
- XSS in the Next.js frontend
- Secrets exposed via committed files or API responses
- Privilege escalation via role manipulation

Out of scope: vulnerabilities in third-party dependencies (report those upstream), rate limiting issues, and theoretical attacks with no practical exploit path.
