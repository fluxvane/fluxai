"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "signin" | "register";

const FEATURE_PILLS = [
  { label: "Streaming", icon: "✦" },
  { label: "Any OpenAI-compatible proxy", icon: "✺" },
  { label: "Zero backend", icon: "◉" },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, hasConfig, isLoaded, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      router.replace(hasConfig ? "/chat" : "/config");
    }
  }, [isLoaded, user, hasConfig, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "signin"
          ? await login(email, password)
          : await register(email, password, name);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.replace(result.hasConfig ? "/chat" : "/config");
    } finally {
      setBusy(false);
    }
  };

  const ready =
    mode === "signin"
      ? Boolean(email.trim() && password)
      : Boolean(name.trim() && email.trim() && password);

  return (
    <main className="login-page">
      <div className="login-bg" aria-hidden>
        <div className="login-bg__mesh login-bg__mesh--green" />
        <div className="login-bg__mesh login-bg__mesh--emerald" />
        <div className="login-bg__grain" />
      </div>

      <div className="login-grid">
        {/* LEFT — pitch */}
        <section className="login-pitch">
          <div
            className="login-brand"
            style={{ animation: "flux-fade-up 0.6s var(--ease-out) both" }}
          >
            <span className="login-brand__mark" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
                <path d="M19 16l.7 1.6L21 18l-1.3.4L19 20l-.7-1.6L17 18l1.3-.4L19 16z" />
              </svg>
            </span>
            <span className="login-brand__name">Flux AI</span>
          </div>

          <h1
            className="login-headline"
            style={{
              animation: "flux-fade-up 0.7s var(--ease-out) both",
              animationDelay: "0.08s",
            }}
          >
            Talk to any model.
            <br />
            Through your own proxy.
          </h1>

          <p
            className="login-sub"
            style={{
              animation: "flux-fade-up 0.7s var(--ease-out) both",
              animationDelay: "0.16s",
            }}
          >
            Connect your OpenAI-compatible endpoint, drop in an API key, and
            start chatting with 200+ models — from Gemini and GPT to Claude and
            beyond. Your keys stay in your browser.
          </p>

          <ul
            className="login-pills"
            style={{
              animation: "flux-fade-up 0.7s var(--ease-out) both",
              animationDelay: "0.24s",
            }}
          >
            {FEATURE_PILLS.map((pill) => (
              <li key={pill.label} className="login-pill">
                <span className="login-pill__icon" aria-hidden>
                  {pill.icon}
                </span>
                {pill.label}
              </li>
            ))}
          </ul>
        </section>

        {/* RIGHT — auth card */}
        <section className="login-card-wrap">
          <div
            className="login-card"
            style={{ animation: "flux-fade-up 0.55s var(--ease-out) both" }}
          >
            {/* mode switcher */}
            <div
              className="login-mode"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                role="tab"
                aria-selected={mode === "signin"}
                className={`login-mode__btn ${mode === "signin" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                type="button"
              >
                Sign in
              </button>
              <button
                role="tab"
                aria-selected={mode === "register"}
                className={`login-mode__btn ${mode === "register" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                type="button"
              >
                Create account
              </button>
              <span
                className="login-mode__indicator"
                aria-hidden
                style={{
                  transform: `translateX(${mode === "register" ? "100%" : "0%"})`,
                }}
              />
            </div>

            <h2 className="login-card__title">
              {mode === "signin" ? "Welcome back" : "Get started"}
            </h2>
            <p className="login-card__hint">
              {mode === "signin"
                ? "Sign in with the email and password you used to register."
                : "Your credentials are stored locally in your browser. Nothing is sent to a server."}
            </p>

            {error && (
              <div
                className="login-error"
                role="alert"
                style={{ animation: "flux-fade-up 0.2s var(--ease-out) both" }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {mode === "register" && (
                <div
                  className="login-field"
                  style={{
                    animation: "flux-fade-up 0.25s var(--ease-out) both",
                  }}
                >
                  <label htmlFor="auth-name" className="login-field__label">
                    Your name <span aria-hidden>*</span>
                  </label>
                  <div className="login-field__shell">
                    <span className="login-field__icon" aria-hidden>
                      <svg
                        viewBox="0 0 24 24"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                      </svg>
                    </span>
                    <input
                      id="auth-name"
                      type="text"
                      className="login-field__input"
                      placeholder="Ada Lovelace"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required={mode === "register"}
                    />
                  </div>
                </div>
              )}

              <div className="login-field">
                <label htmlFor="auth-email" className="login-field__label">
                  Email <span aria-hidden>*</span>
                </label>
                <div className="login-field__shell">
                  <span className="login-field__icon" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2.5" />
                      <path d="M3 7l9 6 9-6" />
                    </svg>
                  </span>
                  <input
                    id="auth-email"
                    type="email"
                    className="login-field__input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="auth-password" className="login-field__label">
                  Password <span aria-hidden>*</span>
                </label>
                <div className="login-field__shell">
                  <span className="login-field__icon" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    id="auth-password"
                    type={showPw ? "text" : "password"}
                    className="login-field__input"
                    placeholder={
                      mode === "register" ? "At least 8 characters" : "••••••••"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    required
                  />
                  <button
                    type="button"
                    className="login-field__reveal"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      <svg
                        viewBox="0 0 24 24"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 6.1A11 11 0 0 1 12 6c5 0 9 4 10 6-.5 1-1.7 2.7-3.5 4.1" />
                        <path d="M6.1 6.1C4 7.6 2.5 9.6 2 12c1 2 5 6 10 6 1.7 0 3.2-.4 4.5-1" />
                        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={busy || !ready}
              >
                <span className="login-submit__shine" aria-hidden />
                <span className="login-submit__label">
                  {busy
                    ? "Please wait…"
                    : mode === "signin"
                      ? "Sign in"
                      : "Create account"}
                </span>
                {!busy && (
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                )}
              </button>
            </form>

            <p className="login-foot">
              {mode === "signin"
                ? "New to Flux AI? "
                : "Already have an account? "}
              <button
                type="button"
                className="login-foot__link"
                onClick={() => {
                  setMode(mode === "signin" ? "register" : "signin");
                  setError(null);
                }}
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
