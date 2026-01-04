"use client";

import { useEffect, useMemo, useState } from "react";
import { clearToken, getToken } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import NavAdmin from "@/components/templates/NavAdmin";
import NavAvatar from "@/components/templates/NavAvatar";
import NavNotifications from "@/components/templates/NavNotifications";
import { usePendingRequestCount } from "@/hooks/usePendingRequestCount";

type Me = { id: number; email: string; username: string; role: string; avatar_url?: string | null };

function isAdminRole(role: string | undefined | null) {
  return role === "admin" || role === "staff";
}

export function NavAuth() {
  const token = useMemo(() => getToken(), []);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const pendingCount = usePendingRequestCount(token);

  useEffect(() => {
    async function run() {
      try {
        if (!token) {
          setMe(null);
          return;
        }

        const data = await apiGet<Me>("/auth/me", "browser", undefined, token);
        setMe(data);
      } catch {
        setMe(null);
        clearToken();
      } finally {
        setReady(true);
      }
    }

    void run();
  }, [token]);

  function logout() {
    clearToken();
    window.location.href = "/login";
  }

  if (!ready) {
    return <span className="loading loading-dots loading-xs"></span>;
  }

  if (!me) {
    return (
      <div className="flex items-center gap-3 text-sm text-ctp-text">
        <a className="btn btn-outline" href="/login">
          Login
        </a>
        <a className="btn btn-primary" href="/register">
          Register
        </a>
      </div>
    );
  }

  const showAdmin = isAdminRole(me.role);

  return (
    <div className="flex items-center gap-3 text-sm text-ctp-text">
      <NavNotifications token={token} meId={me.id} />
      <NavAvatar me={me} pendingCount={pendingCount} onLogoutAction={logout} />
      <NavAdmin show={showAdmin} />
    </div>
  );
}
