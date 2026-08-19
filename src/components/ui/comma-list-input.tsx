"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * A comma-separated field has to keep its own text.
 *
 * Deriving the value from the parsed list swallows the separator in the very
 * render it was typed in -- "攻略," parses to one entry and formats back to
 * "攻略" -- so the comma never survives and a second entry cannot be typed at
 * all. The list still flows up on every keystroke; only the text stays local.
 */
export function CommaListInput<T>({
  value,
  format,
  parse,
  onChange,
  onEscape,
  placeholder,
}: {
  value: T[] | undefined;
  format: (value: T[] | undefined) => string;
  parse: (text: string) => T[];
  onChange: (value: T[]) => void;
  onEscape?: () => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => format(value));

  return (
    <Input
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parse(e.target.value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onEscape?.();
      }}
    />
  );
}

export const formatStringList = (value: string[] | undefined) =>
  value?.join(", ") ?? "";

export const parseStringList = (text: string) =>
  text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
