# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main`  | ✅        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email **[Me@Jonlevesque.com](mailto:Me@Jonlevesque.com)** with a description of the vulnerability, steps to reproduce, and potential impact. We will respond promptly and credit reporters in release notes unless you prefer to remain anonymous.

## Scope

In-scope vulnerabilities include:
- SQL injection or RLS bypass in the Drizzle query layer
- Authentication bypass or token forgery in the Hono auth middleware
- Cross-tenant data leakage
- XSS in the Next.js frontend
- Secrets exposed via committed files or API responses
- Privilege escalation via role manipulation

Out of scope: vulnerabilities in third-party dependencies (report those upstream), rate limiting issues, and theoretical attacks with no practical exploit path.
