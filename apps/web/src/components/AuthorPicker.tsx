"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import Button from "@/components/Button";
import { handlePickerError } from "@/lib/pickerErrors";

type AuthorOpt = { id: number; name: string };

function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

async function lookupAuthors(q: string): Promise<AuthorOpt[]> {
  const token = getToken();
  if (!token) throw new Error("NO_TOKEN");

  const search = new URLSearchParams();
  search.set("q", q);
  search.set("limit", "20");
  const path = `/admin/authors/lookup?${search.toString()}`;
  const data = await apiGet<{ items: AuthorOpt[] }>(path, "browser", undefined, token);
  return data.items;
}

export default function AuthorPicker({
  value,
  onChangeAction,
  onAuthErrorAction,
  onForbiddenAction,
}: {
  value: AuthorOpt[];
  onChangeAction: (next: AuthorOpt[]) => void;
  onAuthErrorAction: () => void;
  onForbiddenAction: () => void;
}) {
  const [q, setQ] = useState("");
  const dq = useDebounce(q.trim(), 250);

  const [results, setResults] = useState<AuthorOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr(null);

      if (dq.length < 1) {
        setResults([]);
        return;
      }

      try {
        const items = await lookupAuthors(dq);
        if (!cancelled) setResults(items);
      } catch (e: any) {
        const msg = handlePickerError(e, onAuthErrorAction, onForbiddenAction);
        if (msg && !cancelled) setErr(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dq, onAuthErrorAction, onForbiddenAction]);

  function add(a: AuthorOpt) {
    if (value.some((x) => x.id === a.id)) return;
    onChangeAction([...value, a]);
    setQ("");
    setOpen(false);
  }

  function remove(id: number) {
    onChangeAction(value.filter((x) => x.id !== id));
  }

  const selectedIds = new Set(value.map((v) => v.id));
  const filtered = results.filter((r) => !selectedIds.has(r.id));

  return (
    <div className="space-y-2">
      {/* chips */}
      <div className="flex flex-wrap gap-2">
        {value.map((a) => (
          <span key={a.id} className="border rounded px-2 py-1 text-sm inline-flex items-center gap-2">
            {a.name}
            <Button type="button" variant="plain" size="none" className="opacity-70 hover:opacity-100" onClick={() => remove(a.id)}>
              ×
            </Button>
          </span>
        ))}
        {value.length === 0 && <div className="text-sm opacity-60">No authors selected.</div>}
      </div>

      {/* input */}
      <div className="relative">
        <input
          className="input w-full"
          placeholder="Type to search authors…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />

        {open && (filtered.length > 0 || err) && (
          <div className="absolute z-10 mt-1 w-full border rounded bg-white max-h-64 overflow-auto">
            {err ? (
              <div className="p-2 text-sm">Error: {err}</div>
            ) : (
              filtered.map((a) => (
                <Button
                  key={a.id}
                  type="button"
                  variant="plain"
                  size="none"
                  className="w-full justify-start px-3 py-2 text-left hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()} // keep focus
                  onClick={() => add(a)}
                >
                  {a.name}
                </Button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
