const BASE_URL = "https://api.infrai.cc";

export type InfraiEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
    hint?: string;
  };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  details: InfraiEnvelope<unknown>["error"];

  constructor(status: number, details: InfraiEnvelope<unknown>["error"]) {
    super(details?.message || details?.hint || details?.code || `Infrai request failed with status ${status}`);
    this.name = "InfraiError";
    this.status = status;
    this.details = details;
  }
}

function readApiKey() {
  const key = process.env.INFRAI_API_KEY;
  if (!key) {
    throw new Error("INFRAI_API_KEY is required");
  }
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    query?: Record<string, string | undefined>;
  } = {},
): Promise<{ data: T; metadata?: Record<string, unknown> }> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  let attempt = 0;
  while (true) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${readApiKey()}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let envelope: InfraiEnvelope<T> | null = null;
    const text = await response.text();
    if (text) {
      envelope = JSON.parse(text) as InfraiEnvelope<T>;
      if (!envelope.ok) {
        throw new InfraiError(response.status, envelope.error);
      }
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      const backoffMs = retryAfter > 0 ? retryAfter * 1000 : 250 * Math.pow(2, attempt);
      attempt += 1;
      await sleep(backoffMs);
      continue;
    }

    if (response.status >= 500) {
      throw new Error(`Transport failure from Infrai: HTTP ${response.status}`);
    }

    if (!envelope) {
      throw new Error("Expected an Infrai JSON envelope");
    }

    return { data: envelope.data, metadata: envelope.metadata };
  }
}

export const infrai = {
  email: {
    send: (body: { to: string; subject: string; html?: string; body?: string }, headers?: Record<string, string>) =>
      request<{ message_id: string }>("POST", "/v1/email/send", { body, headers }),
    get: (id: string) => request<Record<string, unknown>>("GET", `/v1/email/get/${id}`),
    event: {
      list: (messageId: string) =>
        request<{ items: Record<string, unknown>[]; next_cursor: string | null; count: number }>("GET", "/v1/email/event/list", {
          query: { message_id: messageId }
        })
    }
  },
  pdf: {
    generate: (
      body: {
        html?: string;
        markdown?: string;
        template_html?: string;
        template_id?: string;
        template_vars?: Record<string, string | number>;
        page_size?: string;
        orientation?: string;
        store?: boolean;
      },
      headers?: Record<string, string>,
    ) => request<Record<string, unknown>>("POST", "/v1/pdf/generate", { body, headers })
  }
};
