'use client'
import { LuSun, LuMoon, LuMonitor } from "react-icons/lu";
import { useTheme, type ThemePreference } from "../lib/theme/theme-context";

const OPTIONS: { value: ThemePreference; icon: typeof LuSun; label: string }[] = [
    { value: "light", icon: LuSun, label: "Light theme" },
    { value: "system", icon: LuMonitor, label: "Match system theme" },
    { value: "dark", icon: LuMoon, label: "Dark theme" },
];

export default function ThemeToggle() {
    const { preference, setPreference } = useTheme();

    return (
        <div className="flex items-center gap-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5">
            {OPTIONS.map(({ value, icon: Icon, label }) => {
                const isActive = preference === value;
                return (
                    <button
                        key={value}
                        onClick={() => setPreference(value)}
                        aria-label={label}
                        aria-pressed={isActive}
                        className={
                            isActive
                                ? "flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white"
                                : "flex items-center justify-center w-8 h-8 rounded-full text-gray-500 dark:text-zinc-400"
                        }
                    >
                        <Icon className="text-base" />
                    </button>
                );
            })}
        </div>
    );
}
