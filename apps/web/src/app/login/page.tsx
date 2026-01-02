"use client";

import { useState } from "react";
import { apiSend } from "@/lib/api";
import { setToken } from "@/lib/auth";
import Button from "@/components/Button";
import Panel from "@/components/Panel";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setStatus(null);
    setLoading(true);
    try {
      const out = await apiSend<{ access_token: string }>(
        "/auth/login",
        "browser",
        "POST",
        { email, password }
      );
      setToken(out.access_token);
      window.location.href = "/me";
    } catch (e: any) {
      setStatus(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      <Panel variant="mantle" padding="md">
        <div className="space-y-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email</legend>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="you@example.com"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Password</legend>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              placeholder="••••••••"
            />
          </fieldset>

          <Button onClick={submit} disabled={loading} variant="primary" className="w-full">
            {loading ? "Logging in..." : "Login"}
          </Button>

          {status ? <p className="text-sm text-ctp-subtext0">{status}</p> : null}

          <p className="text-sm text-ctp-subtext0">
            Don't have an account?{" "}
            <a className="link link-info" href="/register">
              Register
            </a>
          </p>
        </div>
      </Panel>
    </main>
  );
}
