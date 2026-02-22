# Vivid — Financial Digital Twin

**Your Financial Digital Twin. Beyond Credit Scores.**

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
- [Hackathon Context](#hackathon-context)
- [License](#license)

---

## The Problem

- **FICO is 35 years old** and was not designed for gig workers, freelancers, or the underbanked.
- **45 million Americans are credit invisible** — no score or thin file.
- Traditional credit scores miss **income stability**, **spending behavior**, **resilience**, and **growth momentum**.
- Credit unions and community banks need a **trustworthy, multi-dimensional** view of applicants.

---

## Our Solution

**Vivid** builds a **Financial Digital Twin** — a living, AI-powered replica of a person’s complete financial identity:

1. **Connect** bank account via Plaid (sandbox for demo).
2. **Analyze** up to 24 months of transactions with Vertex AI (Gemini 1.5 Pro).
3. **Score** across 5 dimensions: Income Stability, Spending Discipline, Debt Trajectory, Financial Resilience, Growth Momentum.
4. **Narrate** consumer-friendly and institution-ready summaries.
5. **Stamp** a profile hash on **Hedera Hashgraph** (HCS) for tamper-proof verification.
6. **Share** with lenders via permissioned links.

---

## Key Features

**Consumer side**

- 5-dimension scores (0–100) + overall weighted score
- Dark-mode dashboard with radar chart, timeline, score cards, AI narrative
- Permissioned sharing via UUID share tokens
- Blockchain verification badge (Hedera)
- **AI Financial Chatbot** — floating assistant powered by Vertex AI (Gemini), with full access to the user's twin data for personalized, context-aware advice
- **Dual Voice TTS** — choose between Nova (female, warm) or Atlas (male, analytical); responses are read aloud via the Web Speech API with graceful fallback if unavailable
- Template-based fallback responses ensure the chatbot works even when Vertex AI is offline

**Institution side**

- Loan officer view via share link
- AI-generated lending narrative and lending readiness by product (personal, auto, mortgage, small business)
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
    Hedera[Hedera HCS]
    Fastify --> PlaidAPI
    Fastify --> AIPipeline
    Fastify --> ChatService
    AIPipeline --> Hedera
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
  Fastify --> KMS
```

---

## Tech Stack

| Layer        | Technology |
|-------------|------------|
| Frontend    | React 18, TypeScript, Vite, Tailwind, Zustand, TanStack Query, React Router, Recharts, Framer Motion, Firebase JS SDK, react-plaid-link, Web Speech API (TTS) |
| Backend     | Node.js 20, Fastify v4, Prisma, Zod, LangChain.js, @google-cloud/vertexai, @hashgraph/sdk, Plaid SDK, firebase-admin |
| Database    | PostgreSQL 15 (Cloud SQL), Firestore |
| Infra       | Cloud Run, Firebase Hosting, Pub/Sub, KMS, Secret Manager, Cloud Storage |
| Blockchain  | Hedera Testnet (HCS) |

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
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://vivid:password@localhost:5432/vivid_dev`) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK (server) |
| `VITE_FIREBASE_*` | Firebase client config for the frontend |
| `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox` | Plaid sandbox |
| `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_TOPIC_ID` | Hedera testnet (optional for local dev) |

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

Share links (no auth required to view):

- Marcus: `http://localhost:5173/share/00000000-0000-4000-8000-000000000001`
- Sarah: `http://localhost:5173/share/00000000-0000-4000-8000-000000000002`

---

## API Reference

Base URL: `/api/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register with Firebase token + name |
| GET | `/auth/me` | Bearer | Current user |
| GET | `/plaid/link-token` | Bearer | Get Plaid Link token |
| POST | `/plaid/exchange-token` | Bearer | Exchange public token, start twin generation (202) |
| GET | `/twin` | Bearer | Get current user's twin |
| POST | `/share` | Bearer | Create share token |
| GET | `/share` | Bearer | List share tokens |
| GET | `/share/access/:token` | — | Access twin by share token (public) |
| POST | `/chat` | Bearer | Send a chat message; returns AI or template response grounded in user's twin |
| POST | `/institution/register` | — | Register institution |
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

## Hackathon Context

Built for **LIVE AI Ivy Plus 2026**. Main sponsor: **BankSocial** — a blockchain-first fintech platform for credit unions (DeFi, DLT, Hedera, FedNow/RTP). Vivid extends this ecosystem with a multi-dimensional, blockchain-verified financial identity.

---

## Team

Manny Serrano and Kevin Benitez 
---

## License

MIT
