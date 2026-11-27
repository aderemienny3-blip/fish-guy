// Next.js calls this for every unhandled server error. We forward it to the owner by email.
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routePath?: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { alertAdmin } = await import("@/lib/alert");
  await alertAdmin(`${request.method} ${context.routePath || request.path}`, err);
}
