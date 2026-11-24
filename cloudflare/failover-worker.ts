export interface Env {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const primary = await forward(request.clone(), env.PRIMARY_ORIGIN, 8_000);
      if (primary.status < 500) return primary;
    } catch {
      // O Bonto pode estar reiniciando ou excedendo o tempo de resposta.
    }

    try {
      const secondary = await forward(request.clone(), env.SECONDARY_ORIGIN, 55_000);
      const headers = new Headers(secondary.headers);
      headers.set('x-lordes-backend', 'render-standby');
      return new Response(secondary.body, { status: secondary.status, headers });
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Serviço temporariamente indisponível.' }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'retry-after': '30' },
      });
    }
  },
};
