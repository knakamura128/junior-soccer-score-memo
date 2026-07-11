export function buildApiErrorResponse(error: unknown, fallbackMessage: string) {
  const message = normalizeApiErrorMessage(error, fallbackMessage);
  const status = isDatabaseError(error) ? 503 : isAuthErrorMessage(message) ? 401 : 400;
  return new Response(message, { status });
}

function normalizeApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isDatabaseError(error)) {
    return error instanceof Error ? error.message : fallbackMessage;
  }

  return "DBエラーが発生しました。時間をおいて再度お試しください。改善しない場合は管理者に連絡してください。";
}

function isDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "PrismaClientInitializationError" ||
    error.name === "PrismaClientKnownRequestError" ||
    error.message.includes("Can't reach database server") ||
    error.message.includes("does not exist in the current database") ||
    error.message.includes("The column") ||
    error.message.includes("The table")
  );
}

function isAuthErrorMessage(message: string) {
  return (
    message.includes("LINEログイン") ||
    message.includes("LINE認証") ||
    message.includes("LINEアクセストークン")
  );
}
