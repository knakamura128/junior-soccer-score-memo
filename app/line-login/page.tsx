"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { completeLineLoginHandoffFromCallback } from "@/lib/line-liff-client";

type CallbackState = "loading" | "completed" | "error";

export default function LineLoginPage() {
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("LINEログインを確認しています。");

  const params = useMemo(() => {
    if (typeof window === "undefined") {
      return { handoff: "", returnTo: "/" };
    }
    const searchParams = new URLSearchParams(window.location.search);
    const returnTo = sanitizeReturnTo(searchParams.get("returnTo") || "/");
    return {
      handoff: searchParams.get("handoff") || "",
      returnTo
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      if (!params.handoff) {
        setState("error");
        setMessage("ログイン引き渡し情報が見つかりません。ホーム画面のアプリからもう一度ログインしてください。");
        return;
      }

      try {
        const session = await completeLineLoginHandoffFromCallback(params.handoff, params.returnTo);
        if (!session || cancelled) {
          return;
        }
        setState("completed");
        setMessage("LINEログインが完了しました。ホーム画面のFC KUMANOアプリに戻るとログイン状態になります。");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState("error");
        setMessage(error instanceof Error ? error.message : "LINEログインの完了に失敗しました。");
      }
    }

    void completeLogin();
    return () => {
      cancelled = true;
    };
  }, [params.handoff, params.returnTo]);

  return (
    <main className="app-shell">
      <section className="card line-login-card">
        <p className="eyebrow">LINE Login</p>
        <h1>{state === "completed" ? "ログイン完了" : state === "error" ? "ログイン確認エラー" : "ログイン確認中"}</h1>
        <p className={state === "error" ? "error" : "auth-meta"}>{message}</p>
        <div className="stack-actions">
          <Link href={params.returnTo || "/"} className="primary">
            アプリ画面を開く
          </Link>
        </div>
      </section>
    </main>
  );
}

function sanitizeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}
