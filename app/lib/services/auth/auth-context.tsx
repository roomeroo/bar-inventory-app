'use client'
import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "./auth.service";
import { getBarId } from "../bar/bar.service";

export interface AuthUser {
    id: string
    username: string
}

interface AuthContextValue {
    user: AuthUser | null
    loading: boolean
    signup: (username: string, password: string) => Promise<{ error: string | null }>
    signin: (username: string, password: string) => Promise<{ error: string | null }>
    signout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null);

// A session can outlive the account it belongs to (e.g. the account was
// deleted directly in the database while the browser still holds a
// valid, unexpired token). Without this check every page's data fetch
// would fail forever with no way to recover — this catches it once,
// centrally, and signs the stale session out instead.
async function isAccountValid(userId: string): Promise<boolean> {
    try {
        await getBarId(userId);
        return true;
    } catch {
        return false;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function resolveUser(candidate: AuthUser | null) {
            if (candidate && !(await isAccountValid(candidate.id))) {
                await authService.signout();
                candidate = null;
            }
            if (!cancelled) setUser(candidate);
        }

        authService.getSession()
            .then(({ user }) => resolveUser(user))
            .catch(() => resolveUser(null))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        const unsubscribe = authService.onAuthStateChange((user) => {
            resolveUser(user);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    async function signup(username: string, password: string) {
        const { user, error } = await authService.signup(username, password);
        if (user) setUser(user);
        return { error };
    }

    async function signin(username: string, password: string) {
        const { user, error } = await authService.signin(username, password);
        if (user) setUser(user);
        return { error };
    }

    async function signout() {
        await authService.signout();
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, signup, signin, signout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
