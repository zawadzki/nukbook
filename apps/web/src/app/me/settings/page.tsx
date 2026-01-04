"use client";

import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/auth";
import { apiBase, apiSend } from "@/lib/api";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import Avatar from "@/components/ui/Avatar";
import ProfileCover from "@/components/ui/ProfileCover";
import { useMeSummary } from "@/hooks/useMeSummary";

export default function SettingsPage() {
  const [token, setToken] = useState<string | null>(null);
  const { me, setMe, status, followersCount, followingCount } = useMeSummary(token);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    setToken(getToken());
  }, []);

  function logout() {
    clearToken();
    window.location.href = "/login";
  }

  async function uploadPhoto(kind: "avatar" | "cover", file: File) {
    setUploadStatus(null);
    if (!me) return;
    const token = getToken();
    if (!token) {
      setUploadStatus("Not logged in.");
      return;
    }

    if (kind === "avatar") {
      setUploadingAvatar(true);
    } else {
      setUploadingCover(true);
    }

    try {
      const body = new FormData();
      body.append("file", file);
      const base = apiBase("browser");
      const res = await fetch(`${base}/me/${kind}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Failed to upload ${kind}`);
      }
      const data = (await res.json()) as { avatar_url?: string | null; cover_url?: string | null };
      setMe((prev) =>
        prev
          ? {
              ...prev,
              avatar_url: data.avatar_url ?? prev.avatar_url,
              cover_url: data.cover_url ?? prev.cover_url,
            }
          : prev
      );
    } catch (e: any) {
      setUploadStatus(e?.message ?? `Failed to upload ${kind}`);
    } finally {
      if (kind === "avatar") {
        setUploadingAvatar(false);
      } else {
        setUploadingCover(false);
      }
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <a className="btn btn-outline btn-primary btn-sm rounded-full" href="/me">
          Back to profile
        </a>
      </div>

      {status ? <p className="text-ctp-subtext0">{status}</p> : null}
      {actionStatus ? <p className="text-ctp-subtext0">{actionStatus}</p> : null}

      {me ? (
        <Panel padding="md" className="space-y-4">
          <div className="space-y-3">
            <div className="relative h-28 overflow-hidden rounded-lg bg-ctp-base">
              <ProfileCover
                coverUrl={me.cover_url}
                imgClassName="h-full w-full object-cover"
                placeholderClassName="h-full w-full rounded-lg border-0"
              />
            </div>

            <div className="flex items-center gap-3">
              <Avatar src={me.avatar_url} username={me.username} size="lg" />
              <div>
                <div className="text-lg font-semibold">@{me.username}</div>
                <div className="text-sm text-ctp-subtext0">{me.email}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="grid gap-1">
                <span className="text-ctp-subtext0">Avatar photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input file-input-ghost"
                  disabled={uploadingAvatar}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void uploadPhoto("avatar", file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-ctp-subtext0">Cover photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input file-input-ghost"
                  disabled={uploadingCover}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void uploadPhoto("cover", file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {uploadStatus ? <p className="text-sm text-ctp-subtext0">{uploadStatus}</p> : null}
          </div>

          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-ctp-subtext0">ID</dt>
              <dd className="text-ctp-text">{me.id}</dd>
            </div>
            <div>
              <dt className="text-ctp-subtext0">Email</dt>
              <dd className="text-ctp-text">{me.email}</dd>
            </div>
            <div>
              <dt className="text-ctp-subtext0">Username</dt>
              <dd className="text-ctp-text">{me.username}</dd>
            </div>
            <div>
              <dt className="text-ctp-subtext0">Role</dt>
              <dd className="text-ctp-text">{me.role}</dd>
            </div>
            <div>
              <dt className="text-ctp-subtext0">Account privacy</dt>
              <dd className="text-ctp-text">
                <label className="label">
                  <input
                    type="checkbox"
                    className={me.is_private ? "toggle toggle-success" : "toggle toggle-primary"}
                    checked={me.is_private}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      setMe((prev) => (prev ? { ...prev, is_private: next } : prev));
                      setActionStatus(null);
                      try {
                        const token = getToken();
                        if (!token) return;
                        await apiSend("/me/privacy", "browser", "PATCH", { is_private: next }, token);
                      } catch (err: any) {
                        setMe((prev) => (prev ? { ...prev, is_private: !next } : prev));
                        setActionStatus(err?.message ?? "Failed to update privacy");
                      }
                    }}
                  />
                  {me.is_private ? "Private" : "Public"}
                </label>
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-3 text-sm">
            <a className="hover:underline" href="/following">
              Following{followingCount != null ? ` (${followingCount})` : ""}
            </a>
            <a className="hover:underline" href="/followers">
              Followers{followersCount != null ? ` (${followersCount})` : ""}
            </a>
          </div>

          <div className="mt-2">
            <Button variant="outline" onClick={logout}>
              Log out
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel padding="md">
          <p className="text-sm text-ctp-subtext0">
            If you’re not logged in, go to{" "}
            <a className="text-ctp-text hover:underline" href="/login">
              Login
            </a>
            .
          </p>
        </Panel>
      )}
    </main>
  );
}
