"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchPeopleAction } from "@/app/actions/people-actions";
import type { Person } from "@/db/schema";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  disabled,
  autoFocus,
  id,
  className,
  onKeyDown: externalOnKeyDown,
}: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchMentions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const results = await searchPeopleAction(query);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
    setSelectedIndex(0);
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart ?? newValue.length;

    // Find if we're typing after an @ that isn't inside [[@...]]
    const textBefore = newValue.slice(0, cursorPos);
    const atIndex = textBefore.lastIndexOf("@");

    if (atIndex >= 0) {
      // Check if this @ is already inside a [[@...]] reference
      const beforeAt = textBefore.slice(0, atIndex);
      if (beforeAt.endsWith("[[")) {
        // Already inside wiki-link — don't show autocomplete
        setShowSuggestions(false);
        setMentionStart(null);
        return;
      }

      const query = textBefore.slice(atIndex + 1);
      // Only trigger if query is reasonable
      if (query.length >= 0 && !query.includes("\n")) {
        setMentionStart(atIndex);
        setMentionQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchMentions(query), 150);
        return;
      }
    }

    setShowSuggestions(false);
    setMentionStart(null);
  };

  const insertMention = (person: Person) => {
    if (mentionStart === null) return;

    // Replace "@query" (from mentionStart to mentionStart + 1 + query length) with [[@Name]]
    const before = value.slice(0, mentionStart);
    const afterIndex = mentionStart + 1 + mentionQuery.length;
    const after = value.slice(afterIndex);

    const mention = `[[@${person.name}]]`;
    const newValue = before + mention + (after.startsWith(" ") ? after : " " + after);

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);
    setMentionQuery("");
    setSuggestions([]);

    // Restore focus
    requestAnimationFrame(() => {
      const pos = before.length + mention.length + 1;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        if (selected) insertMention(selected);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    externalOnKeyDown?.(e);
  };

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        id={id}
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover p-1 shadow-md"
        >
          {suggestions.map((person, i) => (
            <button
              key={person.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                i === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(person);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="font-medium">{person.name}</span>
              {person.company && (
                <span className="text-xs text-muted-foreground">
                  {person.company}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
