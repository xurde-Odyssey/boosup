"use client";

import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";

const MAX_LOGO_BYTES = 200 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Labels = {
  label: string;
  hint: string;
  choose: string;
  replace: string;
  remove: string;
  preview: string;
  tooLarge: string;
  invalidType: string;
};

export function CompanyLogoUploadField({
  name,
  initialValue,
  labels,
}: {
  name: string;
  initialValue: string;
  labels: Labels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(labels.invalidType);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setError(labels.tooLarge);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextValue = typeof reader.result === "string" ? reader.result : "";
      if (!nextValue) {
        setError(labels.invalidType);
        return;
      }

      setValue(nextValue);
      setError("");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setValue("");
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const hasPreview = Boolean(value);

  return (
    <div className="md:col-span-2">
      <label className="mb-2 block text-sm font-semibold text-slate-700">{labels.label}</label>
      <input type="hidden" name={name} value={value} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {hasPreview ? (
              <Image
                src={value}
                alt={labels.preview}
                width={112}
                height={96}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <div className="px-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {labels.preview}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm leading-6 text-slate-600">{labels.hint}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                {hasPreview ? labels.replace : labels.choose}
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
              {hasPreview ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {labels.remove}
                </button>
              ) : null}
            </div>
            {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
