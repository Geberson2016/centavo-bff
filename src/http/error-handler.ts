import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';
import type { components } from '../contract/schema.ts';
import { UpstreamResponseError, UpstreamUnavailableError } from './errors.ts';

type Problem = components['schemas']['Problem'];

function sendProblem(reply: FastifyReply, problem: Problem) {
  return reply
    .code(problem.status)
    .type('application/problem+json')
    .send(JSON.stringify(problem));
}

// Todo erro sai como RFC 7807 com `code` estável, no mesmo formato do Spring.
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof UpstreamResponseError) {
      reply.code(error.status);
      if (error.contentType) reply.type(error.contentType);
      // 403 do Spring vem sem corpo; os demais erros trazem o problem+json.
      const hasBody = error.body !== undefined && error.body !== '';
      return reply.send(hasBody ? JSON.stringify(error.body) : undefined);
    }

    if (error instanceof UpstreamUnavailableError) {
      request.log.warn({ err: error.cause }, 'backend indisponível');
      return sendProblem(reply, {
        status: 502,
        title: 'Bad Gateway',
        code: 'UPSTREAM_UNAVAILABLE',
      });
    }

    // Erros do próprio Fastify na leitura da request (JSON malformado, content-type
    // não suportado, corpo grande demais): erro do cliente, no formato do Spring.
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return sendProblem(reply, {
        status: error.statusCode,
        code: 'VALIDATION_ERROR',
      });
    }

    request.log.error(error);
    return sendProblem(reply, { status: 500, code: 'INTERNAL_ERROR' });
  });
}
