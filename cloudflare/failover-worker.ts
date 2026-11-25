export interface Env {
  STATIC_ORIGIN: string;
  PRIMARY_ORIGIN: string;
  SECONDARY_ORIGIN: string;
}

function upstreamUrl(origin: string, requestUrl: URL): string {
  const base = new URL(origin);
  base.pathname = requestUrl.pathname;
  base.search = requestUrl.search;
  return base.toString();
}

async function forward(request: Request, origin: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('upstream timeout'), timeoutMs);
  try {
    const target = upstreamUrl(origin, new URL(request.url));
    const headers = new Headers(request.headers);
    headers.set('x-lordes-failover-hop', origin);
    return await fetch(new Request(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
      signal: controller.signal,
    }));
  } finally {
    clearTimeout(timer);
  }
}

function apiResponse(response: Response, backend: string): Response {
  const headers = new Headers(response.headers);
  headers.set('x-lordes-backend', backend);
  return new Response(response.body, { status: response.status, headers });
}

function isApiResponse(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').includes('application/json');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (!pathname.startsWith('/api/')) {
      return fetch(new Request(upstreamUrl(env.STATIC_ORIGIN, new URL(request.url)), request));
    }

    const isRead = request.method === 'GET' || request.method === 'HEAD';
    try {
      const primary = await forward(request.clone(), env.PRIMARY_ORIGIN, 8_000);
      if (isApiResponse(primary) && (primary.status < 500 || !isRead)) {
        return apiResponse(primary, 'bonto-primary');
      }
      console.warn({ event: 'bonto_fallback', status: primary.status });
    } catch {
      console.warn({ event: 'bonto_fallback', reason: 'unreachable' });
    }

    try {
      const secondary = await forward(request.clone(), env.SECONDARY_ORIGIN, 55_000);
      if (isApiResponse(secondary) && secondary.status < 500) return apiResponse(secondary, 'render-standby');
      console.error({ event: 'api_unavailable', status: secondary.status });
      if (isApiResponse(secondary)) return apiResponse(secondary, 'render-standby');
    } catch {
      console.error({ event: 'api_unavailable', reason: 'unreachable' });
    }

    return Response.json({ ok: false, error: 'Painel temporariamente indisponível. Tente de novo em alguns instantes.' }, {
      status: 503,
      headers: { 'cache-control': 'no-store', 'retry-after': '30' },
    });
  },
};
