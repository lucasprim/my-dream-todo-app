"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESETS = [
  { label: "Daily", value: "every day" },
  { label: "Weekly", value: "every week" },
  { label: "Monthly", value: "every month" },
  { label: "Yearly", value: "every year" },
  { label: "Weekdays", value: "every weekday" },
] as const;

const UNITS = [
  { label: "days", value: "days" },
  { label: "weeks", value: "weeks" },
  { label: "months", value: "months" },
  { label: "years", value: "years" },
] as const;

interface RecurrencePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [mode, setMode] = useState<"preset" | "custom">(
    value && !PRESETS.some((p) => normalizeRule(p.value) === normalizeRule(value))
      ? "custom"
      : "preset"
  );
  const [customInterval, setCustomInterval] = useState("2");
  const [customUnit, setCustomUnit] = useState("weeks");
  const [afterCompletion, setAfterCompletion] = useState(
    value?.startsWith("every!") ?? false
  );

  const handlePreset = (preset: string) => {
    const rule = afterCompletion
      ? preset.replace("every", "every!")
      : preset;
    onChange(rule);
  };

  const handleCustom = (interval?: string, unit?: string) => {
    const i = interval ?? customInterval;
    const u = unit ?? customUnit;
    const n = parseInt(i, 10);
    if (isNaN(n) || n < 1) return;
    const prefix = afterCompletion ? "every!" : "every";
    const rule = n === 1
      ? `${prefix} ${u.replace(/s$/, "")}`
      : `${prefix} ${n} ${u}`;
    onChange(rule);
  };

  const toggleAfterCompletion = () => {
    const next = !afterCompletion;
    setAfterCompletion(next);
    if (value) {
      if (next) {
        onChange(value.replace(/^every\b/, "every!"));
      } else {
        onChange(value.replace(/^every!/, "every"));
      }
    }
  };

  const activePreset = value
    ? PRESETS.find(
        (p) =>
          normalizeRule(p.value) === normalizeRule(value)
      )?.value
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={mode === "preset" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("preset")}
        >
          Presets
        </Button>
        <Button
          type="button"
          variant={mode === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("custom")}
        >
          Custom
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={afterCompletion}
            onClick={toggleAfterCompletion}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              afterCompletion ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                afterCompletion ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <Label className="text-xs text-muted-foreground cursor-pointer" onClick={toggleAfterCompletion}>
            After completion
          </Label>
        </div>
      </div>

      {mode === "preset" ? (
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant={activePreset === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Every</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={customInterval}
            onChange={(e) => {
              setCustomInterval(e.target.value);
              handleCustom(e.target.value, undefined);
            }}
            className="w-16 h-8"
          />
          <Select
            value={customUnit}
            onValueChange={(v) => {
              setCustomUnit(v);
              handleCustom(undefined, v);
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {value && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Preview: <span className="font-medium text-foreground">{formatRecurrenceLabel(value)}</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-destructive hover:text-destructive"
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

function normalizeRule(rule: string): string {
  return rule.replace(/^every!\s*/, "every ").toLowerCase().trim();
}

export function formatRecurrenceLabel(rule: string): string {
  if (!rule) return "";
  const isAfter = rule.startsWith("every!");
  const body = rule.replace(/^every!?\s*/i, "").trim();

  const parts: string[] = [];
  parts.push("Every");

  // Capitalize first letter of each word
  parts.push(
    body
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );

  if (isAfter) {
    parts.push("(after completion)");
  }

  return parts.join(" ");
}
