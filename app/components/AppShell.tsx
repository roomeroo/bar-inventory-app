'use client'
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "../lib/services/auth/auth-context";
import { routes } from "../lib/routes";
import NavButton from "./NavButton";
import ThemeToggle from "./ThemeToggle";

const AUTH_ROUTES = ["/login", "/signup"];

// Grows from phone-width up to a comfortable desktop reading width instead
// of staying pinned to max-w-md on every screen size.
const SHELL_WIDTH = "max-w-md sm:max-w-2xl lg:max-w-4xl";

function Shell({ children }: { children: React.ReactNode }) {
    const { user, loading, signout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    // The manage board is desktop-only and needs real horizontal room for
    // its columns — wider than the phone-style shell every other page
    // uses, and with no bottom tab bar eating into that space.
    const isManageRoute = pathname.startsWith("/manage");

    useEffect(() => {
        if (loading) return;
        if (!user && !isAuthRoute) router.replace("/login");
        if (user && isAuthRoute) router.replace("/");
    }, [loading, user, isAuthRoute, router]);

    if (loading) {
        return (
            <div className={`${SHELL_WIDTH} mx-auto min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center`}>
                <p className="text-base text-gray-500 dark:text-zinc-400">Loading...</p>
            </div>
        )
    }

    // Redirect is in flight — render nothing to avoid a flash of the wrong screen.
    if (!user && !isAuthRoute) return null;
    if (user && isAuthRoute) return null;

    const showChrome = Boolean(user) && !isAuthRoute;
    const showBottomNav = showChrome && !isManageRoute;
    const width = isManageRoute ? "max-w-full" : SHELL_WIDTH;

    return (
        <div className={`${width} mx-auto min-h-screen bg-white dark:bg-zinc-900 ${isManageRoute ? "" : "sm:shadow-xl sm:my-6 sm:rounded-3xl sm:overflow-hidden"} flex flex-col`}>
            <div className={`flex items-center ${showChrome ? "justify-between" : "justify-end"} gap-3 px-6 pt-5`}>
                {showChrome && (
                    <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">@{user!.username}</span>
                )}
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    {showChrome && (
                        <button onClick={() => signout()} className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            Sign out
                        </button>
                    )}
                </div>
            </div>
            <div className={showBottomNav ? "flex-1 pb-24" : "flex-1"}>
                {children}
            </div>
            {showBottomNav && (
                <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full ${SHELL_WIDTH} bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-zinc-800 sm:rounded-b-3xl`}>
                    <ul className="flex">
                        {routes.map((route) => (
                            <li key={route.href} className="flex-1">
                                <NavButton route={route} />
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </div>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <Shell>{children}</Shell>
        </AuthProvider>
    );
}
