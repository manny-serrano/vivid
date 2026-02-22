// ---------------------------------------------------------------------------
// Vivid – Attestation Controller (Networked Reputation Graph)
// ---------------------------------------------------------------------------

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  registerProvider,
  verifyProviderApiKey,
  listProviders,
  submitAttestation,
  getUserAttestations,
  verifyAttestation,
  revokeAttestation,
  calculateReputationScore,
  getReputationGraph,
} from '../services/attestation.service.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// Provider registration (open — self-service for MVP)
// ---------------------------------------------------------------------------

interface RegisterProviderBody {
  name: string;
  type: string;
  domain: string;
  contactEmail?: string;
  logoUrl?: string;
}

export async function registerProviderHandler(
  request: FastifyRequest<{ Body: RegisterProviderBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { name, type, domain } = request.body ?? {};
  if (!name || !type || !domain) {
    throw new BadRequestError('name, type, and domain are required');
  }

  const result = await registerProvider(request.body);
  await reply.status(201).send(result);
}

// ---------------------------------------------------------------------------
// List providers (public)
// ---------------------------------------------------------------------------

export async function listProvidersHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const providers = await listProviders();
  await reply.send({ providers });
}

// ---------------------------------------------------------------------------
// Submit attestation (enterprise partner via API key)
// ---------------------------------------------------------------------------

interface SubmitAttestationBody {
  userEmail: string;
  attestationType: string;
  claim: string;
  details?: string;
  evidence?: string;
  startDate?: string;
  endDate?: string;
  strength?: number;
}

export async function submitAttestationHandler(
  request: FastifyRequest<{ Body: SubmitAttestationBody }>,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = request.headers['x-vivid-api-key'] as string | undefined;
  if (!apiKey) throw new UnauthorizedError('x-vivid-api-key header is required');

  const provider = await verifyProviderApiKey(apiKey);
  if (!provider) throw new UnauthorizedError('Invalid API key');

  const { userEmail, attestationType, claim } = request.body ?? {};
  if (!userEmail || !attestationType || !claim) {
    throw new BadRequestError('userEmail, attestationType, and claim are required');
  }

  const attestation = await submitAttestation(provider.id, request.body);
  await reply.status(201).send(attestation);
}

// ---------------------------------------------------------------------------
// User's own attestations (authenticated)
// ---------------------------------------------------------------------------

export async function getMyAttestationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const attestations = await getUserAttestations(user.id);
  const reputation = await calculateReputationScore(user.id);
  const graph = await getReputationGraph(user.id);

  await reply.send({ attestations, reputation, graph });
}

// ---------------------------------------------------------------------------
// Reputation score only (authenticated)
// ---------------------------------------------------------------------------

export async function getReputationHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const reputation = await calculateReputationScore(user.id);
  await reply.send(reputation);
}

// ---------------------------------------------------------------------------
// Graph data (authenticated)
// ---------------------------------------------------------------------------

export async function getGraphHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const graph = await getReputationGraph(user.id);
  await reply.send(graph);
}

// ---------------------------------------------------------------------------
// Verify attestation by hash (public)
// ---------------------------------------------------------------------------

interface VerifyParams {
  attestationHash: string;
}

export async function verifyAttestationHandler(
  request: FastifyRequest<{ Params: VerifyParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { attestationHash } = request.params;
  if (!attestationHash) throw new BadRequestError('attestationHash is required');

  const result = await verifyAttestation(attestationHash);
  if (!result) {
    await reply.status(404).send({ error: 'Attestation not found' });
    return;
  }

  await reply.send(result);
}

// ---------------------------------------------------------------------------
// Revoke attestation (provider via API key)
// ---------------------------------------------------------------------------

interface RevokeBody {
  attestationId: string;
  reason?: string;
}

export async function revokeAttestationHandler(
  request: FastifyRequest<{ Body: RevokeBody }>,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = request.headers['x-vivid-api-key'] as string | undefined;
  if (!apiKey) throw new UnauthorizedError('x-vivid-api-key header is required');

  const provider = await verifyProviderApiKey(apiKey);
  if (!provider) throw new UnauthorizedError('Invalid API key');

  const { attestationId, reason } = request.body ?? {};
  if (!attestationId) throw new BadRequestError('attestationId is required');

  await revokeAttestation(attestationId, provider.id, reason);
  await reply.send({ success: true });
}

// ---------------------------------------------------------------------------
// Request attestation (user asks provider to attest — creates a pending invite)
// ---------------------------------------------------------------------------

interface RequestAttestationBody {
  providerDomain: string;
  attestationType: string;
  message?: string;
}

export async function requestAttestationHandler(
  request: FastifyRequest<{ Body: RequestAttestationBody }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const { providerDomain, attestationType, message } = request.body ?? {};
  if (!providerDomain || !attestationType) {
    throw new BadRequestError('providerDomain and attestationType are required');
  }

  const provider = await prisma.attestationProvider.findUnique({
    where: { domain: providerDomain },
  });

  await reply.send({
    status: 'request_sent',
    providerFound: !!provider,
    providerName: provider?.name ?? providerDomain,
    attestationType,
    userEmail: user.email,
    message: provider
      ? `Request sent to ${provider.name}. They will be notified to verify your ${attestationType}.`
      : `Provider ${providerDomain} is not yet on Vivid. We've noted your request — when they join, your attestation will be first in queue.`,
  });
}
