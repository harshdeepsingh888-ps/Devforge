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
    <div className="fixed inset-0 flex items-center justify-center bg-[#050706] p-4 font-mono text-xs">
      <div className="w-full max-w-md space-y-5 border border-[#161a18] bg-[#080a09] p-6">
        <div className="space-y-1">
          <h1 className="text-base font-bold uppercase tracking-wider text-zinc-100">
            DevForge
          </h1>

          <p className="text-[#6b7280]">
            {mode === "login"
              ? "Sign in to continue."
              : "Create your DevForge account."}
          </p>
        </div>

        <div className="grid grid-cols-2 border border-[#161a18]">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`px-3 py-2 ${
              mode === "login"
                ? "bg-emerald-500 text-black font-bold"
                : "bg-[#050706] text-[#9ca3af]"
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`px-3 py-2 ${
              mode === "register"
                ? "bg-emerald-500 text-black font-bold"
                : "bg-[#050706] text-[#9ca3af]"
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="border border-rose-500/30 bg-rose-500/10 p-2 text-rose-400">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-[#9ca3af]">
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
                className="w-full border border-[#161a18] bg-[#050706] px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-[#9ca3af]">
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
              className="w-full border border-[#161a18] bg-[#050706] px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-[#9ca3af]">
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
              className="w-full border border-[#161a18] bg-[#050706] px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500"
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
            className="w-full bg-emerald-500 px-4 py-2 font-bold text-black transition-colors hover:bg-emerald-600 disabled:opacity-50"
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