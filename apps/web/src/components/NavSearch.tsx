"use client";

import React, { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { apiGet } from "@/lib/api";
import BookCover from "@/components/BookCover";
import Avatar from "@/components/Avatar";
import Panel from "@/components/Panel";

type SearchAuthor = {
  id: number;
  name: string;
  photo_url?: string | null;
};

type SearchBook = {
  id: number;
  title: string;
  cover_url?: string | null;
  authors: SearchAuthor[];
};

type SearchUser = {
  id: number;
  username: string;
  avatar_url?: string | null;
};

type SearchResults = {
  books: SearchBook[];
  authors: SearchAuthor[];
  users: SearchUser[];
};

type RecentItem = {
  type: "book" | "author" | "user";
  id: number;
  label: string;
  href: string;
  image_url?: string | null;
  sublabel?: string | null;
};

const RECENT_KEY = "nukbook_recent_searches";
const RECENT_LIMIT = 8;
const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 300;

function loadRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function saveRecent(items: RecentItem[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, RECENT_LIMIT)));
  } catch {
    // Ignore storage failures
  }
}

export default function NavSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();
  const isUserQuery = trimmed.startsWith("@");

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmed, results]);

  useEffect(() => {
    if (!trimmed) {
      setResults(null);
      setStatus(null);
      setLoading(false);
      return;
    }

    if (trimmed.length < MIN_QUERY_LEN) {
      setResults(null);
      setStatus(null);
      setLoading(false);
      return;
    }

    if (trimmed === "@") {
      setResults({ books: [], authors: [], users: [] });
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const data = await apiGet<SearchResults>(
          `/search?q=${encodeURIComponent(trimmed)}&limit=5`,
          "browser"
        );
        setResults(data);
        setStatus(null);
      } catch (e: any) {
        setStatus(e?.message ?? "Search failed");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [trimmed]);

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(true);
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  }

  const hasResults =
    (results?.books?.length ?? 0) > 0 ||
    (results?.authors?.length ?? 0) > 0 ||
    (results?.users?.length ?? 0) > 0;

  const showDropdown = open;
  const showHint = trimmed.length > 0 && trimmed.length < MIN_QUERY_LEN;
  const showRecent = trimmed.length === 0 && recent.length > 0;

  const bookItems: RecentItem[] = !isUserQuery
    ? (results?.books?.map((b) => ({
        type: "book",
        id: b.id,
        label: b.title,
        href: `/books/${b.id}`,
        image_url: b.cover_url,
        sublabel: b.authors?.length ? b.authors.map((a) => a.name).join(", ") : null,
      })) ?? [])
    : [];
  const authorItems: RecentItem[] = !isUserQuery
    ? (results?.authors?.map((a) => ({
        type: "author",
        id: a.id,
        label: a.name,
        href: `/authors/${a.id}`,
        image_url: a.photo_url,
      })) ?? [])
    : [];
  const userItems: RecentItem[] =
    results?.users?.map((u) => ({
      type: "user",
      id: u.id,
      label: `@${u.username}`,
      href: `/users/${u.id}`,
      image_url: u.avatar_url,
    })) ?? [];

  const selectableItems = showRecent ? recent : [...bookItems, ...authorItems, ...userItems];

  const authorStart = bookItems.length;
  const userStart = bookItems.length + authorItems.length;

  function addRecent(item: RecentItem) {
    const next = [item, ...recent.filter((r) => r.href !== item.href)].slice(0, RECENT_LIMIT);
    setRecent(next);
    saveRecent(next);
  }

  function handleResultClick(item: RecentItem) {
    addRecent(item);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const max = selectableItems.length - 1;
      if (max < 0) return;
      setActiveIndex((prev) => (prev >= max ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const max = selectableItems.length - 1;
      if (max < 0) return;
      setActiveIndex((prev) => (prev <= 0 ? max : prev - 1));
    } else if (e.key === "Enter") {
      if (activeIndex < 0 || activeIndex >= selectableItems.length) return;
      const target = selectableItems[activeIndex];
      addRecent(target);
      if (target.href) window.location.href = target.href;
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative w-full max-w-prose">
      <label className="input input-ghost input-lg outline-none rounded-full w-full">
        <MagnifyingGlassIcon className="h-5 w-5"/>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search books, authors... Use @ for users"
          className="grow placeholder:text-ctp-text"
          aria-label="Search"
        />
      </label>

      {showDropdown ? (
        <Panel
          padding="xs"
          className="absolute left-0 right-0 mt-2 max-h-96 overflow-auto shadow-sm"
        >
          {showRecent ? (
            <div className="space-y-2">
              <div
                className="flex items-center justify-between px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">
                <span>Recent</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setRecent([]);
                    saveRecent([]);
                    setActiveIndex(-1);
                  }}
                  className="link link-primary"
                >
                  Clear
                </button>
              </div>
              <ul className="space-y-1">
                {recent.map((item, idx) => (
                  <li key={`recent-${item.href}`}>
                    <a
                      href={item.href}
                      onClick={() => handleResultClick(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={[
                        "btn btn-sm btn-ghost w-full justify-start py-6 px-2",
                        idx === activeIndex ? "bg-ctp-surface0" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {item.type === "book" ? (
                        <BookCover
                          coverUrl={item.image_url}
                          title={item.label}
                          className="h-10 w-7"
                        />
                      ) : (
                        <Avatar src={item.image_url} username={item.label} size="xs"/>
                      )}
                      <div className="min-w-0 flex flex-col items-start">
                        <div className="truncate text-sm font-medium">{item.label}</div>
                        {item.sublabel ? (
                          <div className="truncate text-xs text-ctp-subtext0">{item.sublabel}</div>
                        ) : null}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : showHint ? (
            <p className="px-2 py-2 text-sm text-ctp-subtext0">
              Type at least {MIN_QUERY_LEN} characters to search.
            </p>
          ) : loading ? (
            <p className="px-2 py-2 text-sm text-ctp-subtext0">Searching…</p>
          ) : status ? (
            <p className="px-2 py-2 text-sm text-ctp-subtext0">{status}</p>
          ) : !hasResults ? (
            <p className="px-2 py-2 text-sm text-ctp-subtext0">No matches.</p>
          ) : (
            <div className="space-y-4">
              {!isUserQuery && results?.books?.length ? (
                <div className="space-y-2">
                  <div className="px-2 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">
                    Books
                  </div>
                  <ul className="space-y-1">
                    {results.books.map((b, idx) => (
                      <li key={`book-${b.id}`}>
                        <a
                          href={`/books/${b.id}`}
                          onClick={() => handleResultClick(bookItems[idx])}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={[
                            "btn btn-sm btn-ghost w-full justify-start py-6 px-2",
                            idx === activeIndex ? "bg-ctp-surface0" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <BookCover
                            coverUrl={b.cover_url}
                            title={b.title}
                            className="h-10 w-7"
                          />
                          <div className="min-w-0 flex flex-col items-start">
                            <div className="truncate text-sm font-medium">{b.title}</div>
                            {b.authors?.length ? (
                              <div className="truncate text-xs text-ctp-subtext0">
                                {b.authors.map((a) => a.name).join(", ")}
                              </div>
                            ) : null}
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!isUserQuery && results?.authors?.length ? (
                <div className="space-y-2">
                  <div className="px-2 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">
                    Authors
                  </div>
                  <ul className="space-y-1">
                    {results.authors.map((a, idx) => (
                      <li key={`author-${a.id}`}>
                        <a
                          href={`/authors/${a.id}`}
                          onClick={() => handleResultClick(authorItems[idx])}
                          onMouseEnter={() => setActiveIndex(authorStart + idx)}
                          className={[
                            "btn btn-sm btn-ghost w-full justify-start py-6 px-2",
                            authorStart + idx === activeIndex ? "bg-ctp-surface0" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <Avatar src={a.photo_url} username={a.name} size="xs"/>
                          <div className="truncate text-sm font-medium">{a.name}</div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {results?.users?.length ? (
                <div className="space-y-2">
                  <div className="px-2 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">
                    Users
                  </div>
                  <ul className="space-y-1">
                    {results.users.map((u, idx) => (
                      <li key={`user-${u.id}`}>
                        <a
                          href={`/users/${u.id}`}
                          onClick={() => handleResultClick(userItems[idx])}
                          onMouseEnter={() => setActiveIndex(userStart + idx)}
                          className={[
                            "btn btn-sm btn-ghost w-full justify-start py-6 px-2",
                            userStart + idx === activeIndex ? "bg-ctp-surface0" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <Avatar src={u.avatar_url} username={u.username} size="xs"/>
                          <div className="truncate text-sm font-medium">@{u.username}</div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
