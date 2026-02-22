# Vivid — Financial Digital Twin

**Your financial identity, redefined. Beyond credit scores.**

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Demo Accounts](#demo-accounts)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

- **FICO is 35 years old** and was not designed for gig workers, freelancers, or the underbanked.
- **45 million Americans are credit invisible** — no score or thin file.
- Traditional credit scores miss **income stability**, **spending behavior**, **resilience**, and **growth momentum**.
- Credit unions and community banks need a **trustworthy, multi-dimensional** view of applicants.

---

## Our Solution

**Vivid** builds a **Financial Digital Twin** — a living, AI-powered replica of a person's complete financial identity:

1. **Connect** bank account via Plaid (sandbox for demo).
2. **Analyze** up to 24 months of transactions with Vertex AI (Gemini 1.5 Pro).
3. **Score** across 5 dimensions: Income Stability, Spending Discipline, Debt Trajectory, Financial Resilience, Growth Momentum.
4. **Narrate** consumer-friendly and institution-ready summaries.
5. **Stamp** a profile hash on **Hedera Hashgraph** (HCS) for tamper-proof verification.
6. **Share** with lenders via permissioned links.

---

## Key Features

### Consumer Dashboard
- **5-dimension scores** (0–100) + overall weighted Vivid Score
- Radar chart with historical ghost overlay, timeline (income vs. spend), and spending breakdown donut chart
- Pillar explainability — per-dimension reasons and influential transactions
- Interactive narrative with clickable category drilldowns
- Blockchain verification badge (Hedera HCS)
- PDF export via browser print

### AI Financial Chatbot
- Floating chat assistant powered by **Vertex AI (Gemini 1.5 Pro)**
- Fully grounded in the user's live twin data (scores + narrative)
- **Dual voice TTS** — Nova (female, warm) or Atlas (male, analytical) via Web Speech API
- Auto-speak toggle; per-message read-aloud button
- Template-based fallback responses when AI is unavailable

### Spending Optimizer
- Identifies unnecessary recurring charges (subscriptions, fast food, discretionary)
- Monthly and annual savings estimates
- Cancel actions with direct URLs, email drafts, and phone numbers
- AI-generated summary of optimization opportunities

### Loan Shield
- Student and consumer loan risk analysis based on income and debt-to-income ratio
- Shield alerts ranked by severity (low → critical)
- Ready-to-sign documents: IDR applications, deferment requests, forbearance requests
- Documents stamped on Hedera for tamper-proof verification

### Stress Testing
- Built-in scenarios: lose income, full job loss, medical emergency
- Custom scenarios: configure income reduction %, expense increase %, and one-time emergency expense
- Results: months of runway, adjusted dimension scores, financial breakdown comparison, AI narrative

### Anomaly Detection
- Detects lifestyle creep, subscription bloat, income volatility, spending spikes, savings decline
- Severity levels: info, warning, alert
- Financial health score banner
- AI-generated insights per anomaly

### Zero-Knowledge Proofs
- Create cryptographic claims (e.g., "Score above 70") without revealing raw data
- Set threshold, recipient, and expiry per claim
- Verify any proof by hash — public endpoint, no auth required
- Claims stamped on Hedera; revocable at any time

### Verified Badges
- Scoped consent badges for third-party access (overall score, score tier, dimension scores, lending readiness, blockchain verification)
- Embeddable via API endpoint, cURL, or HTML snippet
- Public badge verification endpoint
- Revocable; copy-to-clipboard share link

### Permissioned Sharing
- Generate UUID share tokens with granular permission toggles
- View count tracking per token
- Revoke any token instantly
- Public share view requires no authentication

### Institution / Lender View
- Loan officer portal via share link (no account required to view)
- AI-generated lending narrative and product-level lending readiness (personal, auto, mortgage, small business)
- On-chain verification and compliance-friendly audit trail

---

## Architecture

```mermaid
flowchart TB
  subgraph Frontend
    React[React + Vite]
    FirebaseAuth[Firebase Auth]
    ChatBot[ChatBot + TTS]
    React --> FirebaseAuth
    React --> ChatBot
  end

  subgraph Backend
    Fastify[Fastify API]
    PlaidAPI[Plaid Service]
    AIPipeline[AI Pipeline]
    ChatService[Chat Service]
    Optimizer[Optimizer / Insights / ZKP / Badge]
    Hedera[Hedera HCS]
    Fastify --> PlaidAPI
    Fastify --> AIPipeline
    Fastify --> ChatService
    Fastify --> Optimizer
    AIPipeline --> Hedera
    Optimizer --> Hedera
  end

  subgraph Data
    PostgreSQL[(PostgreSQL)]
    Firestore[(Firestore)]
  end

  subgraph GCP
    PubSub[Pub/Sub]
    VertexAI[Vertex AI Gemini]
    KMS[Cloud KMS]
  end

  React --> Fastify
  ChatBot --> Fastify
  Fastify --> PostgreSQL
  Fastify --> Firestore
  PlaidAPI --> PubSub
  PubSub --> AIPipeline
  AIPipeline --> VertexAI
  ChatService --> VertexAI
  Optimizer --> VertexAI
  Fastify --> KMS
```

**Security highlights:**
- Plaid tokens encrypted at rest (Cloud KMS in prod, AES-256-GCM in dev)
- Firebase ID token verified on all protected routes
- No raw financial data on-chain — only SHA-256 profile hash
- Rate limiting, CORS, and Helmet on Fastify

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React Router, Recharts, Framer Motion, Firebase JS SDK, react-plaid-link, Web Speech API (TTS) |
| **Backend** | Node.js 20, Fastify v4, Prisma ORM, Zod, LangChain.js, `@google-cloud/vertexai`, `@hashgraph/sdk`, Plaid Node SDK, firebase-admin |
| **AI Pipeline** | Vertex AI (Gemini 1.5 Pro) — categorization, 5-pillar scoring, consumer & lender narratives, stress test, anomaly detection, optimizer, loan shield |
| **Database** | PostgreSQL 15 (Cloud SQL), Firestore (real-time status) |
| **Blockchain** | Hedera Consensus Service (HCS) — profile hash, ZKP claims, loan documents |
| **Infra** | GCP: Cloud Run, Pub/Sub, Cloud KMS, Secret Manager, Cloud Storage; Firebase Hosting |

---

## Getting Started

### Prerequisites

- Node.js 20 LTS
- Docker (for local PostgreSQL)
- Firebase project
- (Optional) GCP project, Plaid sandbox, Hedera testnet account

### Clone and install

```bash
git clone <repo-url>
cd vivid
npm install
```

### Environment setup

Copy `.env.example` to `.env` and set variables. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://vivid:password@localhost:5432/vivid_dev`) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK (server) |
| `VITE_FIREBASE_*` | Firebase client config for the frontend |
| `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox` | Plaid sandbox |
| `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_TOPIC_ID` | Hedera testnet (optional for local dev) |
| `GCP_PROJECT_ID`, `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL` | Vertex AI (Gemini) |

### Database setup

```bash
docker-compose up -d
npx prisma migrate dev --schema=prisma/schema.prisma
npx prisma db seed
```

### Run locally

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

---

## Demo Accounts

After seeding:

- **Marcus** (Vivid 74): Gig worker, strong discipline, no credit card — FICO would undersell him.
- **Sarah** (Vivid 61): Salaried, high spend, no buffer — FICO oversells her.

Share links (no auth required):

- Marcus: `http://localhost:5173/share/00000000-0000-4000-8000-000000000001`
- Sarah: `http://localhost:5173/share/00000000-0000-4000-8000-000000000002`

---

## API Reference

Base URL: `/api/v1`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register with Firebase token + name |
| GET | `/auth/me` | Bearer | Current user |
| GET | `/plaid/link-token` | Bearer | Get Plaid Link token |
| POST | `/plaid/exchange-token` | Bearer | Exchange public token, start twin generation (202) |
| GET | `/twin` | Bearer | Get current user's twin |
| POST | `/twin/regenerate` | Bearer | Regenerate twin |
| GET | `/twin/snapshots` | Bearer | Historical twin snapshots |
| GET | `/twin/categories` | Bearer | Spending aggregates by category |
| GET | `/twin/categories/:category` | Bearer | Transaction drilldown for a category |
| GET | `/twin/explain` | Bearer | Pillar explainability report |
| GET | `/optimize/subscriptions` | Bearer | Unnecessary charges and cancel actions |
| GET | `/optimize/loan-shield` | Bearer | Loan risk analysis and IDR/deferment documents |
| GET | `/insights/stress/scenarios` | — | Built-in stress test scenarios |
| POST | `/insights/stress` | Bearer | Run stress test simulation |
| GET | `/insights/anomalies` | Bearer | Anomaly detection report |
| GET | `/zkp/types` | — | Supported ZKP claim types |
| POST | `/zkp` | Bearer | Create a ZKP claim |
| GET | `/zkp` | Bearer | List user's ZKP claims |
| POST | `/zkp/:claimId/revoke` | Bearer | Revoke a ZKP claim |
| GET | `/zkp/verify/:proofHash` | — | Verify a ZKP claim (public) |
| GET | `/verify/scopes` | — | Valid badge scopes |
| POST | `/verify` | Bearer | Create a verified badge |
| GET | `/verify` | Bearer | List user's badges |
| POST | `/verify/:badgeId/revoke` | Bearer | Revoke a badge |
| GET | `/verify/:consentToken` | — | Verify a badge (public) |
| POST | `/share` | Bearer | Create share token |
| GET | `/share` | Bearer | List share tokens |
| POST | `/share/:tokenId/revoke` | Bearer | Revoke a share token |
| GET | `/share/access/:token` | — | Access twin by share token (public) |
| POST | `/chat` | Bearer | Send a chat message; returns AI or template response grounded in user's twin |
| POST | `/institution/register` | — | Register institution |
| GET | `/institution/me` | Bearer (inst) | Get institution profile |
| GET | `/institution/applicant/:token` | Bearer (inst) | View applicant by share token |

---

## Deployment

- **Backend**: Build Docker image from repo root, deploy to Cloud Run.
- **Frontend**: `npm run build -w frontend`, then `firebase deploy --only hosting`.
- Set production env (Secret Manager, Cloud SQL, etc.) in Cloud Run and Firebase.

---

## Contributing

- Branch naming: `feature/...`, `fix/...`
- Commits: clear, conventional style
- PRs: link issue, pass lint and typecheck
- Code style: ESLint + Prettier (see `.eslintrc.json`, `.prettierrc`)

---

## Team

Manny Serrano and Kevin Benitez

---

## License

MIT
