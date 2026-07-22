'use client'
import { useEffect, useRef, useState } from "react";

export interface ComboBoxProps {
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder?: string
    className?: string
}

// A text input with a filtered dropdown of prior values underneath —
// pick a suggestion, or just keep typing to use a brand new value (it's
// not saved anywhere here; it becomes a future suggestion naturally once
// the caller persists it, e.g. as an article's unit).
function rankedMatches(options: string[], query: string): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options
        .filter((o) => o.toLowerCase().includes(q))
        .sort((a, b) => {
            const aExact = a.toLowerCase() === q;
            const bExact = b.toLowerCase() === q;
            if (aExact !== bExact) return aExact ? -1 : 1;
            const aPrefix = a.toLowerCase().startsWith(q);
            const bPrefix = b.toLowerCase().startsWith(q);
            if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
            return a.localeCompare(b);
        });
}

export default function ComboBox({ value, onChange, options, placeholder, className }: ComboBoxProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const matches = rankedMatches(options, value);

    return (
        <div ref={containerRef} className="relative">
            <input
                className={className}
                value={value}
                onChange={(e) => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                autoComplete="off"
            />
            {open && matches.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-lg py-1">
                    {matches.map((option) => (
                        <li key={option}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { onChange(option); setOpen(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-900 dark:text-zinc-50 hover:bg-gray-100 dark:hover:bg-zinc-700"
                            >
                                {option}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
