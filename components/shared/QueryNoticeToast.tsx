"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const getToastVariant = (message: string) => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("required") ||
    normalized.includes("select") ||
    normalized.includes("type") ||
    normalized.includes("error") ||
    normalized.includes("failed")
  ) {
    return "error";
  }

  if (
    normalized.includes("created") ||
    normalized.includes("updated") ||
    normalized.includes("deleted")
  ) {
    return "success";
  }

  return "message";
};

export function QueryNoticeToast({ message }: { message: string }) {
  useEffect(() => {
    if (!message) return;

    const variant = getToastVariant(message);
    const toastId = `query-notice:${variant}:${message}`;
    const toastOptions = {
      id: toastId,
      className: "min-w-[360px] rounded-2xl px-4 py-4 text-base font-semibold shadow-lg",
      descriptionClassName: "text-sm",
    };

    if (variant === "success") {
      toast.success(message, toastOptions);
      return;
    }

    if (variant === "error") {
      toast.error(message, toastOptions);
      return;
    }

    toast.message(message, toastOptions);
  }, [message]);

  return null;
}
