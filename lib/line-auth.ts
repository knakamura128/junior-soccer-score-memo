type VerifiedLineProfile = {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
};

export type LineAuthPayload = {
  idToken?: string;
  accessToken?: string;
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

export async function verifyLineSession({ idToken, accessToken }: LineAuthPayload): Promise<VerifiedLineProfile> {
  if (idToken) {
    try {
      return await verifyLineIdToken(idToken);
    } catch (error) {
      if (!accessToken) {
        throw error;
      }
    }
  }

  if (accessToken) {
    return verifyLineAccessToken(accessToken);
  }

  throw new Error("LINEログインが必要です。");
}

async function verifyLineAccessToken(accessToken: string): Promise<VerifiedLineProfile> {
  const response = await fetch("https://api.line.me/v2/profile", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`LINEアクセストークンの確認に失敗しました。${detail ? ` (${detail})` : ""}`);
  }

  const payload = (await response.json()) as {
    userId: string;
    displayName?: string;
    pictureUrl?: string;
  };

  if (!payload.userId) {
    throw new Error("LINEプロフィールの取得に失敗しました。");
  }

  return {
    lineUserId: payload.userId,
    displayName: payload.displayName || "LINE user",
    pictureUrl: payload.pictureUrl
  };
}
