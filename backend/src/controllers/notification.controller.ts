import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  dismissNotification,
  getOrCreatePreferences,
  updatePreferences,
} from '../services/notification.service.js';

async function resolveUserId(request: FastifyRequest): Promise<string> {
  const firebaseUid = request.user!.uid;
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new Error('User not found');
  return user.id;
}

export async function listNotificationsHandler(
  request: FastifyRequest<{ Querystring: { limit?: string; offset?: string; unreadOnly?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const q = request.query;
  const feed = await getUserNotifications(userId, {
    limit: q.limit ? parseInt(q.limit) : undefined,
    offset: q.offset ? parseInt(q.offset) : undefined,
    unreadOnly: q.unreadOnly === 'true',
  });
  await reply.send(feed);
}

export async function unreadCountHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const count = await getUnreadCount(userId);
  await reply.send({ count });
}

export async function markReadHandler(
  request: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  await markAsRead(request.params.notificationId, userId);
  await reply.send({ success: true });
}

export async function markAllReadHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const count = await markAllRead(userId);
  await reply.send({ success: true, count });
}

export async function dismissHandler(
  request: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  await dismissNotification(request.params.notificationId, userId);
  await reply.send({ success: true });
}

export async function getPreferencesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const prefs = await getOrCreatePreferences(userId);
  await reply.send(prefs);
}

export async function updatePreferencesHandler(
  request: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const prefs = await updatePreferences(userId, request.body);
  await reply.send(prefs);
}
