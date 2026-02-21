# Vivid Architecture

## Overview

Vivid is a monorepo with:

- **packages/shared** — shared TypeScript types and Zod schemas
- **frontend** — React SPA (Vite), Firebase Auth, Tailwind, Zustand, React Query
- **backend** — Fastify API, Prisma, AI pipeline, Hedera, Plaid
- **prisma** — PostgreSQL schema and seed

## Data flow

1. User signs in with Firebase (email or Google).
2. User connects bank via Plaid Link; backend exchanges token, encrypts with KMS, stores on User.
3. Backend publishes a message to Pub/Sub (or in dev runs twin generation synchronously).
4. Worker fetches transactions from Plaid, runs AI pipeline (categorize → aggregate → score → narrate), stamps hash on Hedera, writes Twin + Transaction records.
5. Frontend can poll or listen to Firestore for twin status, then loads twin from REST API.
6. User creates share tokens with granular permissions; institution or public view uses `/share/access/:token`.

## Security

- All Plaid tokens encrypted at rest (Cloud KMS in prod, AES-256-GCM in dev).
- Auth: Firebase ID token verified on protected routes.
- Rate limiting and Helmet/CORS on Fastify.
- No raw financial data on Hedera — only SHA-256 profile hash.

## Blockchain (Hedera)

- Profile hash is deterministic (canonical JSON, sorted keys).
- Message on HCS: `{ profileHash, userIdHash, timestamp, version }`.
- Verification via mirror node API: fetch topic messages, compare hash.
