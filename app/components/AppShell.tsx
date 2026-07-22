'use client'
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "../lib/services/auth/auth-context";
import { routes } from "../lib/routes";
import NavButton from "./NavButton";

const AUTH_ROUTES = ["/login", "/signup"];

function Shell({ children }: { children: React.ReactNode }) {
    const { user, loading, signout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    useEffect(() => {
        if (loading) return;
        if (!user && !isAuthRoute) router.replace("/login");
        if (user && isAuthRoute) router.replace("/");
    }, [loading, user, isAuthRoute, router]);

    if (loading) {
        return (
            <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-zinc-900 shadow-md flex items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-zinc-500">Loading...</p>
            </div>
        )
    }

    // Redirect is in flight — render nothing to avoid a flash of the wrong screen.
    if (!user && !isAuthRoute) return null;
    if (user && isAuthRoute) return null;

    const showChrome = Boolean(user) && !isAuthRoute;

    return (
        <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-zinc-900 shadow-md flex flex-col">
            {showChrome && (
                <div className="flex items-center justify-between px-5 pt-3 text-xs">
                    <span className="text-gray-400 dark:text-zinc-500">@{user!.username}</span>
                    <button onClick={() => signout()} className="font-semibold text-blue-500">
                        Sign out
                    </button>
                </div>
            )}
            <div className={showChrome ? "flex-1 pb-20" : "flex-1"}>
                {children}
            </div>
            {showChrome && (
                <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-gray-100 dark:border-zinc-800">
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
