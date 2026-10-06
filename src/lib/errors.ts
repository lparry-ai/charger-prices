// Database errors that users can act on, in words they understand.
export function friendlyError(
  error: { message?: string } | null | undefined,
  fallback: string,
) {
  if (error?.message?.includes("rate_limited")) {
    return "You’ve sent a lot of reports in a short time. Please wait a while and try again.";
  }
  return fallback;
}
