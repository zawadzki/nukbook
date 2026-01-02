export type ToastPayload = {
  message: string;
  variant?: "info" | "success" | "error";
};

const EVENT = "nukbook:toast";

export function pushToast(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: payload }));
}

export function onToast(handler: (payload: ToastPayload) => void) {
  function listener(e: Event) {
    const ce = e as CustomEvent<ToastPayload>;
    handler(ce.detail);
  }
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
