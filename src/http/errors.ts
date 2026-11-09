// O Spring não respondeu (fora do ar, recusou a conexão ou estourou o timeout).
export class UpstreamUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Backend indisponível', { cause });
    this.name = 'UpstreamUnavailableError';
  }
}

// O Spring respondeu com erro. Carrega status e corpo para serem repassados à UI
// sem alteração: o `code` RFC 7807 é traduzido no frontend, não aqui.
export class UpstreamResponseError extends Error {
  readonly status: number;
  readonly contentType: string | null;
  readonly body: unknown;

  constructor(response: Response, body: unknown) {
    super(`Backend respondeu ${response.status}`);
    this.name = 'UpstreamResponseError';
    this.status = response.status;
    this.contentType = response.headers.get('content-type');
    this.body = body;
  }
}
