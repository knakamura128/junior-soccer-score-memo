export function buildApiErrorResponse(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const status = isAuthErrorMessage(message) ? 401 : 400;
  return new Response(message, { status });
}

function isAuthErrorMessage(message: string) {
  return (
    message.includes("LINEログイン") ||
    message.includes("LINE認証") ||
    message.includes("LINEアクセストークン")
  );
}
