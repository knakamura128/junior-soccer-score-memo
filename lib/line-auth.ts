type VerifiedLineProfile = {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
};

type VerifyResponse = {
  sub: string;
  name?: string;
  picture?: string;
  aud: string;
  error?: string;
  error_description?: string;
};

export async function verifyLineIdToken(idToken: string): Promise<VerifiedLineProfile> {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    throw new Error("LINE_CHANNEL_ID is not configured.");
  }

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: channelId
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as VerifyResponse;
      detail = payload.error_description || payload.error || JSON.stringify(payload);
    } catch {
      detail = await response.text();
    }
    throw new Error(
      `LINE認証の確認に失敗しました。LINE_CHANNEL_ID と LIFF のチャネルが一致しているか確認してください。${detail ? ` (${detail})` : ""}`
    );
  }

  const payload = (await response.json()) as VerifyResponse;
  if (payload.aud !== channelId || !payload.sub) {
    throw new Error("LINE認証の確認に失敗しました。LINE_CHANNEL_ID と LIFF アプリのチャネル設定を確認してください。");
  }

  return {
    lineUserId: payload.sub,
    displayName: payload.name || "LINE user",
    pictureUrl: payload.picture
  };
}
