"use client";

import Button from "@/components/ui/Button";

type ConfirmDialogProps = {
  id: string;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "error" | "warning" | "info" | "success" | "primary" | "neutral" | "soft" | "outline" | "ghost";
  onConfirmAction: () => void;
  busy?: boolean;
};

export default function ConfirmDialog({
  id,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "error",
  onConfirmAction,
  busy,
}: ConfirmDialogProps) {
  function closeDialog() {
    const el = document.getElementById(id) as HTMLDialogElement | null;
    el?.close();
  }

  return (
    <dialog id={id} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="py-4 text-sm text-ctp-subtext0">{description}</p>
        <div className="modal-action">
          <form method="dialog">
            <Button type="submit" variant="ghost">
              Cancel
            </Button>
          </form>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={busy}
            onClick={() => {
              onConfirmAction();
              closeDialog();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
