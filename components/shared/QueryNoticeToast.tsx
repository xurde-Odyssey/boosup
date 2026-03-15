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

    if (variant === "success") {
      toast.success(message);
      return;
    }

    if (variant === "error") {
      toast.error(message);
      return;
    }

    toast.message(message);
  }, [message]);

  return null;
}
