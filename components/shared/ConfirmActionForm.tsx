"use client";

import { ReactNode } from "react";

type HiddenField = {
  name: string;
  value: string;
};

export function ConfirmActionForm({
  action,
  confirmMessage,
  hiddenFields,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  hiddenFields: HiddenField[];
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const shouldContinue = window.confirm(confirmMessage);

        if (!shouldContinue) {
          event.preventDefault();
        }
      }}
    >
      {hiddenFields.map((field) => (
        <input key={`${field.name}-${field.value}`} type="hidden" name={field.name} value={field.value} />
      ))}
      {children}
    </form>
  );
}
