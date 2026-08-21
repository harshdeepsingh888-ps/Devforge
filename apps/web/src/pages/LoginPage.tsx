import React, { useState } from "react";
import { ArrowRight, Lock, Mail, Shield, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("Harshdeep Singh");
  const [email, setEmail] = useState("dev@devforge.io");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (isRegistering) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#09090b] text-text-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-lg p-6 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg font-mono">
            DF
          </div>
          <h1 className="text-xl font-bold text-zinc-100 font-mono tracking-tight">
            DEVFORGE
          </h1>
          <p className="text-xs text-zinc-400 font-sans">
            Engineering Control Plane & Lifecycle Operating System
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 font-mono text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {isRegistering && (
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Alice Dev"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 font-mono"
                placeholder="dev@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-2 transition-colors font-mono disabled:opacity-50"
          >
            <span>{isSubmitting ? "Authenticating..." : isRegistering ? "Register Account" : "Sign In to Workstation"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-zinc-800/80">
          <button
            onClick={() => setIsRegistering((prev) => !prev)}
            className="text-xs text-zinc-400 hover:text-blue-400 font-mono transition-colors"
          >
            {isRegistering
              ? "Already have an account? Sign In"
              : "Need a new workspace? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};
