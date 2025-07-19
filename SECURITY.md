## Supported Versions

We keep these Logistics Platform versions up to date with security fixes:

* **2.x.x** – ✅ Fully supported and secure (latest stable release).
* **1.5.x** – ✅ Long-term support with only critical patches.
* **1.4.x** – ❌ End of life. Upgrade ASAP.
* **Anything older than 1.4** – ❌ Unsupported and vulnerable.

---

## Spot a Bug? Here’s How to Let Us Know

Please don’t post security issues publicly (no GitHub issues!). Instead, choose one of these private channels:

* 📧 **Email:** [security@logistics-platform.com](mailto:security@logistics-platform.com) (PGP key available on request)
* 🛡 **GitHub Security Advisory:** Use the private vulnerability feature
* 🔒 **Secure Form:** Via our internal security portal (if you have access)

**When you report an issue, include:**

1. **Where it hits** (Frontend, API, Mobile, Database, or Real-time)
2. **Type of problem** (e.g., OWASP category)
3. **Steps to reproduce** (the simpler, the better)
4. **Impact** (think driver safety, location leaks, dispatch integrity, customer data)
5. **Fix ideas** (if you have suggestions)

**Our promise:**

* **Ack within 24 business hours.**
* **Full triage in 72 hours.**
* **Weekly status updates.**
* **Patch schedule:**

  * Critical: within 7 days
  * High: within 14 days
  * Medium: within 30 days
  * Low: next regular release

---

## What We Protect

**In scope:**

* Next.js web app & Node.js APIs
* React Native mobile apps
* Real-time systems (Socket.io, Redis)
* Postgres/PostGIS database
* Authentication & API endpoints (REST/WebSocket)
* Geospatial queries & maps
* Integrations (Mapbox, external APIs)

**Out of scope:**

* Social engineering or phishing
* Physical device security
* Third-party services beyond our control
* Bugs that aren’t security-related (just open a regular issue)

---

## Why It Matters

* **Driver safety & privacy** – We encrypt location data, keep driver IDs safe, and secure real-time tracking.
* **Operational integrity** – Dispatch and route optimization must stay rock-solid.
* **Data protection** – We follow GDPR/CCPA, use TLS 1.3, AES-256, and strict CORS and tenant isolation.

---

## Our Bounty Program

We reward solid reports:

* **Critical issues:** \$500–\$2,000
* **High severity:** \$200–\$500
* **Medium severity:** \$50–\$200
* **Hall of Fame:** Recognition for top contributors

Payments depend on impact, report quality, and exploit ease.

---

## How We Stay Sharp

* **Code security:** TypeScript strict mode, OWASP best practices, parameterized PostGIS queries, rate limiting.
* **Auth & sessions:** MFA for admins, RBAC for users, secure JWTs, safe session handling.
* **Data security:** AES-256 at rest, TLS 1.3 in transit, strict CORS, locked-down Redis, audit logs.
* **Infrastructure:** Automated deps updates, Docker best practices, protected CI/CD secrets.

**Tools we use:**

* SAST (ESLint rules, TypeScript checks)
* DAST and pentests
* Dependency scans (npm audit, Snyk)
* Container scanning
* Real-time security monitoring

---

**Last updated:** July 19, 2025
**Next review:** Every quarter

Questions? Reach out to [security@logistics-platform.com](mailto:security@logistics-platform.com) or call our emergency line.
