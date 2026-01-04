"use client";

import { useState } from "react";
import { apiSend } from "@/lib/api";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setStatus(null);
    setLoading(true);
    try {
      await apiSend("/auth/register", "browser", "POST", { email, username, password });
      window.location.href = "/login";
    } catch (e: any) {
      setStatus(e?.message ?? "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Register</h1>

      <Panel variant="mantle" padding="md">
        <div className="space-y-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email</legend>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="john@doe.com"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Username</legend>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input w-full"
              placeholder="johndoe"
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
            {loading ? "Registering..." : "Register"}
          </Button>

          {status ? <p className="text-sm text-ctp-subtext0">{status}</p> : null}

          <p className="text-sm text-ctp-subtext0">
            Already have an account?{" "}
            <a className="link link-info" href="/login">
              Login
            </a>
          </p>
        </div>
      </Panel>
    </main>
  );
}
