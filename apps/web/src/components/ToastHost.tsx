"use client";

import { useEffect, useState } from "react";
import { onToast, type ToastPayload } from "@/lib/toast";

type ToastItem = ToastPayload & { id: number };

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let idSeq = 0;
    return onToast((payload) => {
      const id = ++idSeq;
      const item = { id, ...payload };
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast">
      {items.map((t) => (
        <div
          key={t.id}
          className={[
            "alert",
            t.variant === "success"
              ? "alert-success"
              : t.variant === "error"
                ? "alert-info"
                : "alert-info",
          ].join(" ")}
        >
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
