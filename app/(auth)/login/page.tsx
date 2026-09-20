"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/fitness-id");
    router.refresh();
  }

  return (
    <>
      <h1
        className="text-xl font-bold text-white text-center mb-6"
        style={{ letterSpacing: "-0.02em" }}
      >
        Sign in to your Fitness ID
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@noida.fit"
            className="w-full rounded-lg border border-[#1e2436] bg-[#11141d] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#9ddc2e] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-[#1e2436] bg-[#11141d] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#9ddc2e] focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#9ddc2e] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#64748b]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-white hover:text-[#9ddc2e] transition-colors">
          Create Fitness ID
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-[#64748b]">
        Demo: demo@noida.fit / noida123
      </p>
    </>
  );
}
