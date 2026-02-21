import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Global error handler for Fastify. Maps AppError to HTTP status; logs and returns 500 for unknown errors.
 */
export async function errorHandler(
  error: FastifyError | AppError,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (error instanceof AppError) {
    await reply.status(error.statusCode).send({
      error: error.code ?? 'ERROR',
      message: error.message,
    });
    return;
  }

  logger.error('Unhandled error', { err: error });
  await reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
