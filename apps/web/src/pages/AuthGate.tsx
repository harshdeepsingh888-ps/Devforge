import React, { useState } from "react";
import { api } from "../api/api";

interface AuthGateProps {
  onAuthenticated: () => void;
}

type AuthMode = "login" | "register";

export const AuthGate: React.FC<AuthGateProps> = ({
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      return;
    }

    if (mode === "register" && !displayName.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (mode === "login") {
        await api.login(email.trim(), password);
      } else {
        await api.register(
          email.trim(),
          password,
          displayName.trim(),
        );
      }

      onAuthenticated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#ffffff] p-4 font-sans text-xs select-none">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#d5d9e2] bg-[#f9f8f6] p-8 shadow-sm">
        <div className="space-y-1">
          <div className="font-mono text-[10px] font-bold tracking-widest text-[#858585] uppercase">
            DEVFORGE
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#0a0a0a]">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h1>

          <p className="text-xs text-[#858585]">
            {mode === "login"
              ? "Sign in to access your engineering workspace."
              : "Register your DevForge account."}
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-full border border-[#d5d9e2] bg-[#f2ede5] p-1 gap-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-full py-1.5 text-xs font-semibold transition ${
              mode === "login"
                ? "bg-white text-[#0a0a0a] shadow-xs"
                : "text-[#858585] hover:text-[#0a0a0a]"
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`rounded-full py-1.5 text-xs font-semibold transition ${
              mode === "register"
                ? "bg-white text-[#0a0a0a] shadow-xs"
                : "text-[#858585] hover:text-[#0a0a0a]"
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {mode === "register" && (
            <div>
              <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#858585]">
                Display Name
              </label>

              <input
                type="text"
                required
                maxLength={80}
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                placeholder="Your name"
                className="w-full rounded-lg border border-[#d5d9e2] bg-white px-3.5 py-2 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]/10"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#858585]">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[#d5d9e2] bg-white px-3.5 py-2 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]/10"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#858585]">
              Password
            </label>

            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-[#d5d9e2] bg-white px-3.5 py-2 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]/10"
            />
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !email.trim() ||
              !password ||
              (mode === "register" &&
                !displayName.trim())
            }
            className="w-full rounded-full bg-[#0a0a0a] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#262626] disabled:opacity-40"
          >
            {isSubmitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};