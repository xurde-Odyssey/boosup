"use client";

import { SelectHTMLAttributes } from "react";

type AutoSubmitSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function AutoSubmitSelect(props: AutoSubmitSelectProps) {
  return (
    <select
      {...props}
      onChange={(event) => {
        props.onChange?.(event);
        const form = event.currentTarget.form;
        requestAnimationFrame(() => form?.requestSubmit());
      }}
    />
  );
}
