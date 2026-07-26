import { IoDesktopOutline } from "react-icons/io5";
import ManageBoard from "./ManageBoard";

// The board needs real horizontal space to be usable (multiple columns,
// drag and drop) — rather than trying to squeeze a Trello-style layout
// onto a phone screen, it's desktop-only. Gated with plain responsive
// classes (same lg: breakpoint AppShell already uses), not a JS
// matchMedia check, so there's no hydration flicker.
export default function ManagePage() {
    return (
        <>
            <div className="hidden lg:block h-full">
                <ManageBoard />
            </div>
            <div className="lg:hidden flex flex-col items-center justify-center gap-3 p-10 text-center min-h-[60vh]">
                <IoDesktopOutline className="text-4xl text-gray-400 dark:text-zinc-500" />
                <p className="text-base font-semibold text-gray-700 dark:text-zinc-300">Desktop only</p>
                <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs">
                    Open this page from a computer to reorganize categories and items.
                </p>
            </div>
        </>
    );
}
