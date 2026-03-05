"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
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
  const [activeMention, setActiveMention] = useState<{ query: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Keep a ref to the latest value so insertMention always sees current text
  const valueRef = useRef(value);
  valueRef.current = value;

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
    const textBefore = newValue.slice(0, cursorPos);

    // Find the last standalone @ (not inside an existing [[@...]])
    const atIndex = textBefore.lastIndexOf("@");

    if (atIndex >= 0) {
      const beforeAt = textBefore.slice(0, atIndex);
      if (beforeAt.endsWith("[[")) {
        // Already inside wiki-link — don't show autocomplete
        setShowSuggestions(false);
        setActiveMention(null);
        return;
      }

      const query = textBefore.slice(atIndex + 1);
      if (!query.includes("\n") && !query.includes(" ")) {
        setActiveMention({ query });
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchMentions(query), 150);
        return;
      }
    }

    setShowSuggestions(false);
    setActiveMention(null);
  };

  const insertMention = (person: Person) => {
    if (!activeMention) return;

    // Use the ref to get the absolutely latest value
    const currentValue = valueRef.current;
    // Find the @query pattern we need to replace — search from the end
    const searchStr = `@${activeMention.query}`;
    const idx = currentValue.lastIndexOf(searchStr);
    if (idx === -1) return;

    const before = currentValue.slice(0, idx);
    const after = currentValue.slice(idx + searchStr.length);
    const mention = `[[@${person.name}]]`;
    const newValue = before + mention + (after.startsWith(" ") ? after : " " + after);

    onChange(newValue);
    setShowSuggestions(false);
    setActiveMention(null);
    setSuggestions([]);

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
