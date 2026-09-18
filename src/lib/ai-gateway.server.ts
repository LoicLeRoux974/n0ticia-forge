/**
 * Helpers de connexion à la Lovable AI Gateway (propagation du X-Lovable-AIG-Run-ID).
 * Serveur uniquement.
 */

export function getLovableAiGatewayRunId(request: Request): string | undefined {
  return request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
}

export function getLovableAiGatewayResponseHeaders(
  runId?: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return { ...(runId ? { "X-Lovable-AIG-Run-ID": runId } : {}), ...(extra ?? {}) };
}

/**
 * Enrobe fetch pour capturer le run id minté par la gateway et le renvoyer
 * sur les appels suivants de la même requête.
 */
export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId;
  const fetchWrapper: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has("X-Lovable-AIG-Run-ID")) {
      headers.set("X-Lovable-AIG-Run-ID", runId);
    }
    const res = await fetch(input, { ...init, headers });
    const minted = res.headers.get("X-Lovable-AIG-Run-ID");
    if (minted) runId = minted;
    return res;
  };
  return {
    fetch: fetchWrapper,
    getRunId: () => runId,
  };
}

export function withLovableAiGatewayRunIdHeader(
  response: Response,
  runIdFetch: { getRunId: () => string | undefined },
): Response {
  const runId = runIdFetch.getRunId();
  if (!runId) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Lovable-AIG-Run-ID", runId);
  return new Response(response.body, { status: response.status, headers });
}
