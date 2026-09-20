"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // V1: No real registration endpoint — just inform the user.
    // In production, this would POST to an API route that creates
    // the user in the database, then sign them in.
    setLoading(false);
    setError(
      "Registration is coming soon. For now, sign in with the demo account: demo@noida.fit / noida123"
    );
  }

  return (
    <>
      <h1
        className="text-xl font-bold text-white text-center mb-6"
        style={{ letterSpacing: "-0.02em" }}
      >
        Create your Fitness ID
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-amber-400 text-center">{error}</p>
        )}

        <div>
          <label htmlFor="name" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kabir Singh"
            className="w-full rounded-lg border border-[#1e2436] bg-[#11141d] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#9ddc2e] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[#1e2436] bg-[#11141d] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#9ddc2e] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full rounded-lg border border-[#1e2436] bg-[#11141d] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#9ddc2e] focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#9ddc2e] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Fitness ID"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#64748b]">
        Already have an account?{" "}
        <Link href="/login" className="text-white hover:text-[#9ddc2e] transition-colors">
          Sign In
        </Link>
      </p>
    </>
  );
}
