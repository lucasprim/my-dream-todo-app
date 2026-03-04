"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface QuickCaptureProps {
  onCapture: (title: string) => Promise<void>;
  placeholder?: string;
}

export function QuickCapture({
  onCapture,
  placeholder = "Add a task…",
}: QuickCaptureProps) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await onCapture(trimmed);
      setValue("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={isPending}
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={isPending || !value.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
