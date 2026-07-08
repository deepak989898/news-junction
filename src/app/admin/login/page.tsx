"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginAdmin } from "@/firebase/auth";
import { getAdminUser } from "@/firebase/firestore";
import { BRAND } from "@/lib/constants";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const credential = await loginAdmin(email, password);
      const adminUser = await getAdminUser(credential.user.uid);

      if (!adminUser) {
        setError("You do not have admin access. Contact the site administrator.");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt={BRAND.name}
            width={80}
            height={80}
            className="mx-auto rounded-full"
          />
          <h1 className="mt-4 text-2xl font-bold text-[#1a2b4c]">
            <span>NEWS </span>
            <span className="text-[#c41e20]">JUNCTION</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Admin Panel Login</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-8 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]"
              placeholder="admin@newsjunction.com"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#c41e20] py-3 text-sm font-bold text-white transition-colors hover:bg-[#a01820] disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
