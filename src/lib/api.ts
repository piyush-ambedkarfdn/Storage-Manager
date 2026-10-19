import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

/** An error with an HTTP status that route handlers turn into `{ error }` JSON. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<unknown> | unknown;

/**
 * Wraps a route handler: returns its value as JSON (or the Response it returns),
 * and turns thrown errors into JSON with the right status.
 *   export const POST = handle(async (req) => { ... return { ok: true } })
 */
export function handle<C = unknown>(fn: Handler<C>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const result = await fn(req, ctx);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("[api]", req.method, new URL(req.url).pathname, err);
      return NextResponse.json({ error: "Something went wrong on the server. Please try again." }, { status: 500 });
    }
  };
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export async function parseBody<S extends z.ZodType>(schema: S, req: Request): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "The request body is not valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, firstIssue(parsed.error));
  return parsed.data;
}

export function parseQuery<S extends z.ZodType>(schema: S, url: string | URL): z.infer<S> {
  const params = new URL(url).searchParams;
  const obj: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  const parsed = schema.safeParse(obj);
  if (!parsed.success) throw new ApiError(400, firstIssue(parsed.error));
  return parsed.data;
}
