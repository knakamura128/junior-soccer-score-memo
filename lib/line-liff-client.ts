"use client";

export type LiffClientSession = {
  status: "loading" | "ready" | "error";
  idToken: string;
  accessToken: string;
  displayName: string;
  isInClient: boolean;
  pictureUrl?: string;
  lineUserId?: string;
  error?: string;
};

type StoredHandoff = {
  id: string;
  returnTo: string;
  createdAt: number;
};

type HandoffPollResponse =
  | { status: "pending" | "missing" | "expired" | "consumed" }
  | {
      status: "completed";
      idToken: string;
      accessToken: string;
      displayName: string;
      pictureUrl?: string;
      lineUserId?: string;
    };

export const LINE_LOGIN_HANDOFF_STORAGE_KEY = "score-manager-line-login-handoff";

const HANDOFF_TTL_MS = 10 * 60 * 1000;

export function isIosStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone = navigatorWithStandalone.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return isStandalone && /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

export async function fetchLiffSession(): Promise<LiffClientSession> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) {
    return { status: "error", idToken: "", accessToken: "", displayName: "", isInClient: false, error: "NEXT_PUBLIC_LIFF_ID が未設定です。" };
  }

  const { default: liff } = await import("@line/liff");
  await liff.init({ liffId });
  const isInClient = liff.isInClient();

  if (!liff.isLoggedIn()) {
    return { status: "ready", idToken: "", accessToken: "", displayName: "未ログイン", isInClient };
  }

  const [profile, idToken, accessToken] = await Promise.all([
    liff.getProfile(),
    Promise.resolve(liff.getIDToken() || ""),
    Promise.resolve(liff.getAccessToken() || "")
  ]);

  return {
    status: "ready",
    idToken,
    accessToken,
    displayName: profile.displayName,
    isInClient,
    pictureUrl: profile.pictureUrl,
    lineUserId: profile.userId
  };
}

export async function loginWithLineRedirect() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) {
    throw new Error("NEXT_PUBLIC_LIFF_ID が未設定です。");
  }

  const { default: liff } = await import("@line/liff");
  await liff.init({ liffId });

  if (liff.isLoggedIn()) {
    return "already-logged-in" as const;
  }

  if (isIosStandalone()) {
    const handoff = await createLineLoginHandoff();
    liff.login({ redirectUri: buildLineLoginCallbackUrl(handoff) });
    return "redirecting" as const;
  }

  liff.login({ redirectUri: buildCleanCurrentUrl() });
  return "redirecting" as const;
}

export async function completePendingLineLoginHandoff(): Promise<LiffClientSession | null> {
  const handoff = readStoredHandoff();
  if (!handoff) {
    return null;
  }

  if (Date.now() - handoff.createdAt > HANDOFF_TTL_MS) {
    window.localStorage.removeItem(LINE_LOGIN_HANDOFF_STORAGE_KEY);
    return null;
  }

  const response = await fetch(`/api/line-login/handoff?id=${encodeURIComponent(handoff.id)}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as HandoffPollResponse;
  if (payload.status !== "completed") {
    return null;
  }

  window.localStorage.removeItem(LINE_LOGIN_HANDOFF_STORAGE_KEY);

  return {
    status: "ready",
    idToken: payload.idToken,
    accessToken: payload.accessToken,
    displayName: payload.displayName,
    isInClient: false,
    pictureUrl: payload.pictureUrl,
    lineUserId: payload.lineUserId
  };
}

export function hasPendingLineLoginHandoff() {
  return readStoredHandoff() !== null;
}

export async function completeLineLoginHandoffFromCallback(handoffId: string, returnTo: string) {
  const session = await fetchLiffSession();
  if (!session.idToken && !session.accessToken) {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      throw new Error("NEXT_PUBLIC_LIFF_ID が未設定です。");
    }
    const { default: liff } = await import("@line/liff");
    await liff.init({ liffId });
    liff.login({ redirectUri: buildCleanCurrentUrl() });
    return null;
  }

  const response = await fetch("/api/line-login/handoff", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: handoffId,
      returnTo,
      idToken: session.idToken || undefined,
      accessToken: session.accessToken || undefined
    })
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(detail || "LINEログインの引き渡しに失敗しました。");
  }

  return session;
}

function readStoredHandoff(): StoredHandoff | null {
  try {
    const raw = window.localStorage.getItem(LINE_LOGIN_HANDOFF_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const handoff = JSON.parse(raw) as StoredHandoff;
    if (!handoff.id || !handoff.returnTo || !handoff.createdAt) {
      window.localStorage.removeItem(LINE_LOGIN_HANDOFF_STORAGE_KEY);
      return null;
    }
    return handoff;
  } catch {
    window.localStorage.removeItem(LINE_LOGIN_HANDOFF_STORAGE_KEY);
    return null;
  }
}

async function createLineLoginHandoff() {
  const handoff: StoredHandoff = {
    id: crypto.randomUUID(),
    returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    createdAt: Date.now()
  };

  const response = await fetch("/api/line-login/handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: handoff.id, returnTo: handoff.returnTo })
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(detail || "LINEログインの準備に失敗しました。");
  }

  window.localStorage.setItem(LINE_LOGIN_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
  return handoff;
}

function buildLineLoginCallbackUrl(handoff: StoredHandoff) {
  const url = new URL("/line-login", window.location.origin);
  url.searchParams.set("handoff", handoff.id);
  url.searchParams.set("returnTo", handoff.returnTo);
  return url.toString();
}

function buildCleanCurrentUrl() {
  const url = new URL(window.location.href);
  for (const key of Array.from(url.searchParams.keys())) {
    if (key.startsWith("liff.") || key === "access_token") {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
}
