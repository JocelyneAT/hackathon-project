export async function api<T>(
  path: string,
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(`/api/v1/${path}`, {
      method: data === undefined ? "GET" : "POST",
      headers:
        data instanceof FormData
          ? undefined
          : { "Content-Type": "application/json" },
      body:
        data === undefined
          ? undefined
          : data instanceof FormData
            ? data
            : JSON.stringify(data),
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        typeof body.detail === "string"
          ? body.detail
          : Array.isArray(body.detail)
            ? body.detail.map((e: { msg: string }) => e.msg).join(". ")
            : typeof body.detail?.message === "string"
              ? body.detail.message
              : "The request could not be completed. Check your entries and try again.",
      );
    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "The request timed out or was cancelled. Your profile is still here; try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
