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
    throw new Error("LINE認証の確認に失敗しました。再度LINEでログインしてください。");
  }

  const payload = (await response.json()) as VerifyResponse;
  if (payload.aud !== channelId || !payload.sub) {
    throw new Error("Invalid LINE token audience.");
  }

  return {
    lineUserId: payload.sub,
    displayName: payload.name || "LINE user",
    pictureUrl: payload.picture
  };
}
