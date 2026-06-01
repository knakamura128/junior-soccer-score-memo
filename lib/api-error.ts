export function buildApiErrorResponse(error: unknown, fallbackMessage: string) {
  const message = normalizeApiErrorMessage(error, fallbackMessage);
  const status = isAuthErrorMessage(message) ? 401 : 400;
  return new Response(message, { status });
}

function normalizeApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isDatabaseConnectionError(error)) {
    return error instanceof Error ? error.message : fallbackMessage;
  }

  return "DBに接続できません。時間をおいて再度お試しください。";
}

function isDatabaseConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "PrismaClientInitializationError" || error.message.includes("Can't reach database server");
}

function isAuthErrorMessage(message: string) {
  return (
    message.includes("LINEログイン") ||
    message.includes("LINE認証") ||
    message.includes("LINEアクセストークン")
  );
}
