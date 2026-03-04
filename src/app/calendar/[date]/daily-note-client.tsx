"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft } from "lucide-react";
import { updateDailyNoteContentAction } from "@/app/actions/daily-note-actions";

interface DailyNoteClientProps {
  date: string;
  initialContent: string;
}

export function DailyNoteClient({ date, initialContent }: DailyNoteClientProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateDailyNoteContentAction(date, content);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/calendar"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Calendar
      </Link>

      <h1 className="text-2xl font-bold mb-1">{displayDate}</h1>
      <p className="text-xs text-muted-foreground mb-6">{date}</p>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[400px] font-mono text-sm"
      />

      <div className="flex justify-end mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </Button>
      </div>
    </div>
  );
}
