'use client'
import { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme-preference";

interface ThemeContextValue {
    preference: ThemePreference
    setPreference: (pref: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(pref: ThemePreference) {
    const isDark = pref === "dark" || (pref === "system" && systemPrefersDark());
    document.documentElement.classList.toggle("dark", isDark);
}

function readStoredPreference(): ThemePreference {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);

    useEffect(() => {
        applyTheme(preference);
        if (preference !== "system") return;

        // Following the system: keep the applied theme in sync if the OS
        // preference changes while the app is open.
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => applyTheme("system");
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [preference]);

    function setPreference(pref: ThemePreference) {
        setPreferenceState(pref);
        localStorage.setItem(STORAGE_KEY, pref);
    }

    return (
        <ThemeContext.Provider value={{ preference, setPreference }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
    return ctx;
}
