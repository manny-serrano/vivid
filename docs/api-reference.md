# API Reference

Base path: `/api/v1`.

## Auth

### POST /auth/register

Register or update user with Firebase token.

**Body:** `{ "firebaseToken": string, "firstName": string, "lastName": string }`

**Response (201):** `{ "user": AuthUser, "token": string }`

### GET /auth/me

Current user (requires `Authorization: Bearer <firebaseIdToken>`).

**Response (200):** `{ "user": AuthUser }`

---

## Plaid

### GET /plaid/link-token

Get Plaid Link token for the frontend (requires auth).

**Response (200):** `{ "linkToken": string, "expiration": string }`

### POST /plaid/exchange-token

Exchange public token after Link success; starts twin generation (requires auth).

**Body:** `{ "publicToken": string }`

**Response (202):** `{ "success": true, "message": "Twin generation started" }`

---

## Twin

### GET /twin

Get the authenticated user's Financial Twin (requires auth).

**Response (200):** Twin object (scores, narratives, lending readiness, blockchain fields).

---

## Share

### POST /share

Create a share token (requires auth).

**Body:** `{ "recipientEmail"?: string, "recipientInstitution"?: string, "showOverallScore"?: boolean, ... }`

**Response (201):** `{ "id", "token", "shareUrl", "permissions", "expiresAt", "createdAt" }`

### GET /share

List current user's share tokens (requires auth).

### GET /share/access/:token

Public: access twin data by share token. Returns only fields allowed by the token's permissions.

**Response (200):** `{ "overallScore"?, "scores"?, "consumerNarrative"?, "lendingReadiness"?, "blockchainProof"?, ... }`

---

## Institution

### POST /institution/register

Register an institution (no auth).

**Body:** `{ "name", "type", "email", "firebaseToken", "logoUrl"?: string }`

### GET /institution/applicant/:token

View applicant by share token (requires institution Bearer token).

**Response (200):** Applicant view with twin data and permissions.
