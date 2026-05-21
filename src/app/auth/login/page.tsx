"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/recipes");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src="/icons/wcgl-logo.svg" alt="WCGL logo" width={40} height={40} />
            <span className="font-[family-name:var(--font-gloria)] text-[22px] text-[#3e260f] leading-tight">
              What&apos;s Cookin&apos;, Good Lookin&apos;?
            </span>
          </div>
          <p className="text-[rgba(62,38,15,0.5)] text-sm">Sign in to your recipe collection</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-[#3e260f] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-3 py-2 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.4)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-[#3e260f] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[rgba(34,34,34,0.2)] bg-white px-3 py-2 text-sm text-[#3e260f] placeholder:text-[rgba(62,38,15,0.4)] focus:border-[#b9732c] focus:outline-none focus:ring-1 focus:ring-[#b9732c]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#b9732c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a0621f] focus:outline-none disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-[rgba(62,38,15,0.5)] mt-6">
          No account?{" "}
          <Link href="/auth/signup" className="text-[#b9732c] hover:text-[#a0621f] font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
