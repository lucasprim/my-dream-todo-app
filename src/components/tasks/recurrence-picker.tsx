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

const ORDINALS = [
  { label: "1st", value: "1st" },
  { label: "2nd", value: "2nd" },
  { label: "3rd", value: "3rd" },
  { label: "4th", value: "4th" },
  { label: "Last", value: "last" },
] as const;

const MONTH_DAYS = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" },
  { label: "Weekday", value: "weekday" },
] as const;

const WEEK_DAYS = [
  { label: "Mon", value: "mon" },
  { label: "Tue", value: "tue" },
  { label: "Wed", value: "wed" },
  { label: "Thu", value: "thu" },
  { label: "Fri", value: "fri" },
  { label: "Sat", value: "sat" },
  { label: "Sun", value: "sun" },
] as const;

const MONTHS = [
  { label: "Jan", value: "jan" },
  { label: "Feb", value: "feb" },
  { label: "Mar", value: "mar" },
  { label: "Apr", value: "apr" },
  { label: "May", value: "may" },
  { label: "Jun", value: "jun" },
  { label: "Jul", value: "jul" },
  { label: "Aug", value: "aug" },
  { label: "Sep", value: "sep" },
  { label: "Oct", value: "oct" },
  { label: "Nov", value: "nov" },
  { label: "Dec", value: "dec" },
] as const;

const DAY_NUMBERS = Array.from({ length: 31 }, (_, i) => i + 1);

interface RecurrencePickerProps {
  value: string | null;
  dueDate?: string | null;
  onChange: (value: string | null) => void;
}

export function RecurrencePicker({ value, dueDate, onChange }: RecurrencePickerProps) {
  const [mode, setMode] = useState<"preset" | "custom">(
    value && !PRESETS.some((p) => normalizeRule(p.value) === normalizeRule(value))
      ? "custom"
      : "preset"
  );
  const parsed = value ? parseExistingRule(value) : null;
  const [customInterval, setCustomInterval] = useState(parsed?.interval ?? "2");
  const [customUnit, setCustomUnit] = useState(parsed?.unit ?? "weeks");
  const [monthOrdinal, setMonthOrdinal] = useState<string>(parsed?.monthOrdinal ?? "");
  const [monthDay, setMonthDay] = useState<string>(parsed?.monthDay ?? "");
  const [weekDays, setWeekDays] = useState<string[]>(parsed?.weekDays ?? []);
  const [monthMode, setMonthMode] = useState<"onthe" | "each">(parsed?.monthMode ?? "onthe");
  const [monthDayNumbers, setMonthDayNumbers] = useState<number[]>(parsed?.monthDayNumbers ?? []);
  const [yearMonths, setYearMonths] = useState<string[]>(parsed?.yearMonths ?? []);
  const [yearOrdinal, setYearOrdinal] = useState<string>(parsed?.yearOrdinal ?? "");
  const [yearDay, setYearDay] = useState<string>(parsed?.yearDay ?? "");
  const [afterCompletion, setAfterCompletion] = useState(
    value?.startsWith("every!") ?? false
  );

  const handlePreset = (preset: string) => {
    const rule = afterCompletion
      ? preset.replace("every", "every!")
      : preset;
    onChange(rule);
  };

  const handleCustom = (overrides?: {
    interval?: string;
    unit?: string;
    ordinal?: string;
    day?: string;
    days?: string[];
    mMode?: "onthe" | "each";
    mDayNums?: number[];
    yMonths?: string[];
    yOrdinal?: string;
    yDay?: string;
  }) => {
    const i = overrides?.interval ?? customInterval;
    const u = overrides?.unit ?? customUnit;
    const n = parseInt(i, 10);
    if (isNaN(n) || n < 1) return;
    const prefix = afterCompletion ? "every!" : "every";
    const base = n === 1
      ? `${prefix} ${u.replace(/s$/, "")}`
      : `${prefix} ${n} ${u}`;

    const ord = overrides?.ordinal ?? monthOrdinal;
    const d = overrides?.day ?? monthDay;
    const wd = overrides?.days ?? weekDays;
    const mm = overrides?.mMode ?? monthMode;
    const mdn = overrides?.mDayNums ?? monthDayNumbers;
    const ym = overrides?.yMonths ?? yearMonths;
    const yo = overrides?.yOrdinal ?? yearOrdinal;
    const yd = overrides?.yDay ?? yearDay;

    if (u === "months" && mm === "each" && mdn.length > 0) {
      onChange(`${base} each ${mdn.join(",")}`);
      return;
    }
    if (u === "months" && mm === "onthe" && ord && d) {
      onChange(`${base} on the ${ord} ${d}`);
      return;
    }
    if (u === "years" && ym.length > 0 && yo && yd) {
      onChange(`${base} in ${ym.join("/")} on the ${yo} ${yd}`);
      return;
    }
    if (u === "years" && ym.length > 0) {
      onChange(`${base} in ${ym.join("/")}`);
      return;
    }
    if (u === "weeks" && wd.length > 0) {
      onChange(`${base} on ${wd.join("/")}`);
      return;
    }
    onChange(base);
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
        <>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Every</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={customInterval}
            onChange={(e) => {
              setCustomInterval(e.target.value);
              handleCustom({ interval: e.target.value });
            }}
            className="w-16 h-8"
          />
          <Select
            value={customUnit}
            onValueChange={(v) => {
              setCustomUnit(v);
              setMonthOrdinal("");
              setMonthDay("");
              setWeekDays([]);
              setMonthMode("onthe");
              setMonthDayNumbers([]);
              setYearMonths([]);
              setYearOrdinal("");
              setYearDay("");
              handleCustom({ unit: v, ordinal: "", day: "", days: [], mMode: "onthe", mDayNums: [], yMonths: [], yOrdinal: "", yDay: "" });
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

        {customUnit === "months" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={monthMode === "onthe" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setMonthMode("onthe");
                  setMonthDayNumbers([]);
                  handleCustom({ mMode: "onthe", mDayNums: [] });
                }}
              >
                On the
              </Button>
              <Button
                type="button"
                variant={monthMode === "each" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setMonthMode("each");
                  setMonthOrdinal("");
                  setMonthDay("");
                  handleCustom({ mMode: "each", ordinal: "", day: "" });
                }}
              >
                Each
              </Button>
            </div>
            {monthMode === "onthe" ? (
              <div className="flex items-center gap-2">
                <Select
                  value={monthOrdinal}
                  onValueChange={(v) => {
                    setMonthOrdinal(v);
                    handleCustom({ ordinal: v });
                  }}
                >
                  <SelectTrigger size="sm" className="w-20">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDINALS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={monthDay}
                  onValueChange={(v) => {
                    setMonthDay(v);
                    handleCustom({ day: v });
                  }}
                >
                  <SelectTrigger size="sm" className="w-28">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {DAY_NUMBERS.map((num) => {
                  const active = monthDayNumbers.includes(num);
                  return (
                    <Button
                      key={num}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => {
                        const next = active
                          ? monthDayNumbers.filter((n) => n !== num)
                          : [...monthDayNumbers, num].sort((a, b) => a - b);
                        setMonthDayNumbers(next);
                        handleCustom({ mDayNums: next });
                      }}
                    >
                      {num}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {customUnit === "weeks" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-muted-foreground">on</span>
            {WEEK_DAYS.map((d) => {
              const active = weekDays.includes(d.value);
              return (
                <Button
                  key={d.value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    const next = active
                      ? weekDays.filter((w) => w !== d.value)
                      : [...weekDays, d.value].sort(
                          (a, b) =>
                            WEEK_DAYS.findIndex((w) => w.value === a) -
                            WEEK_DAYS.findIndex((w) => w.value === b)
                        );
                    setWeekDays(next);
                    handleCustom({ days: next });
                  }}
                >
                  {d.label}
                </Button>
              );
            })}
          </div>
        )}

        {customUnit === "years" && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1">
              {MONTHS.map((m) => {
                const active = yearMonths.includes(m.value);
                return (
                  <Button
                    key={m.value}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const next = active
                        ? yearMonths.filter((v) => v !== m.value)
                        : [...yearMonths, m.value].sort(
                            (a, b) =>
                              MONTHS.findIndex((m) => m.value === a) -
                              MONTHS.findIndex((m) => m.value === b)
                          );
                      setYearMonths(next);
                      handleCustom({ yMonths: next });
                    }}
                  >
                    {m.label}
                  </Button>
                );
              })}
            </div>
            {yearMonths.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">on the</span>
                <Select
                  value={yearOrdinal}
                  onValueChange={(v) => {
                    setYearOrdinal(v);
                    handleCustom({ yOrdinal: v });
                  }}
                >
                  <SelectTrigger size="sm" className="w-20">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDINALS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={yearDay}
                  onValueChange={(v) => {
                    setYearDay(v);
                    handleCustom({ yDay: v });
                  }}
                >
                  <SelectTrigger size="sm" className="w-28">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {customUnit === "years" && yearMonths.length > 0 && !yearOrdinal && !dueDate && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Set a due date so the recurrence knows which day of the month to use.
          </p>
        )}
        </>
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

interface ParsedRule {
  interval: string;
  unit: string;
  monthOrdinal: string;
  monthDay: string;
  weekDays: string[];
  monthMode: "onthe" | "each";
  monthDayNumbers: number[];
  yearMonths: string[];
  yearOrdinal: string;
  yearDay: string;
}

function parseExistingRule(rule: string): ParsedRule | null {
  const body = rule.replace(/^every!?\s*/i, "").trim().toLowerCase();

  // months each 5,15,20
  const monthEach = body.match(/^(?:(\d+)\s+)?months?\s+each\s+([\d,]+)$/);
  if (monthEach) {
    return {
      interval: monthEach[1] ?? "1",
      unit: "months",
      monthOrdinal: "", monthDay: "", weekDays: [],
      monthMode: "each",
      monthDayNumbers: monthEach[2]!.split(",").map(Number),
      yearMonths: [], yearOrdinal: "", yearDay: "",
    };
  }

  // months on the ordinal day
  const monthOn = body.match(/^(?:(\d+)\s+)?months?\s+on\s+(?:the\s+)?(1st|first|2nd|second|3rd|third|4th|fourth|last)\s+(\w+)$/);
  if (monthOn) {
    return {
      interval: monthOn[1] ?? "1",
      unit: "months",
      monthOrdinal: monthOn[2]!, monthDay: monthOn[3]!, weekDays: [],
      monthMode: "onthe",
      monthDayNumbers: [],
      yearMonths: [], yearOrdinal: "", yearDay: "",
    };
  }

  // years in months on the ordinal day
  const yearOrd = body.match(/^(?:(\d+)\s+)?years?\s+in\s+([a-z]{3,}(?:\/[a-z]{3,})*)\s+on\s+(?:the\s+)?(1st|first|2nd|second|3rd|third|4th|fourth|last)\s+(\w+)$/);
  if (yearOrd) {
    return {
      interval: yearOrd[1] ?? "1",
      unit: "years",
      monthOrdinal: "", monthDay: "", weekDays: [],
      monthMode: "onthe",
      monthDayNumbers: [],
      yearMonths: yearOrd[2]!.split("/"),
      yearOrdinal: yearOrd[3]!, yearDay: yearOrd[4]!,
    };
  }

  // years in months
  const yearIn = body.match(/^(?:(\d+)\s+)?years?\s+in\s+([a-z]{3,}(?:\/[a-z]{3,})*)$/);
  if (yearIn) {
    return {
      interval: yearIn[1] ?? "1",
      unit: "years",
      monthOrdinal: "", monthDay: "", weekDays: [],
      monthMode: "onthe",
      monthDayNumbers: [],
      yearMonths: yearIn[2]!.split("/"),
      yearOrdinal: "", yearDay: "",
    };
  }

  // weeks on days
  const weeksOn = body.match(/^(?:(\d+)\s+)?weeks?\s+on\s+([a-z]{3}(?:\/[a-z]{3})+)$/);
  if (weeksOn) {
    return {
      interval: weeksOn[1] ?? "1",
      unit: "weeks",
      monthOrdinal: "", monthDay: "",
      weekDays: weeksOn[2]!.split("/"),
      monthMode: "onthe",
      monthDayNumbers: [],
      yearMonths: [], yearOrdinal: "", yearDay: "",
    };
  }

  // simple: N unit
  const simple = body.match(/^(?:(\d+)\s+)?(days?|weeks?|months?|years?)$/);
  if (simple) {
    const unit = simple[2]!.replace(/s?$/, "s");
    return {
      interval: simple[1] ?? "1",
      unit,
      monthOrdinal: "", monthDay: "", weekDays: [],
      monthMode: "onthe",
      monthDayNumbers: [],
      yearMonths: [], yearOrdinal: "", yearDay: "",
    };
  }

  return null;
}

export function formatRecurrenceLabel(rule: string): string {
  if (!rule) return "";
  const isAfter = rule.startsWith("every!");
  const body = rule.replace(/^every!?\s*/i, "").trim();

  const parts: string[] = [];
  parts.push("Every");

  // Capitalize each word; expand slash-separated tokens (jan/jul → Jan, Jul)
  parts.push(
    body
      .split(/\s+/)
      .map((w) => {
        if (w.includes("/")) {
          return w
            .split("/")
            .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
            .join(", ");
        }
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ")
  );

  if (isAfter) {
    parts.push("(after completion)");
  }

  return parts.join(" ");
}
