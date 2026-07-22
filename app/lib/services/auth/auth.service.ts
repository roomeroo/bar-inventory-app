import { supabase } from "../../supabase";
import { toFriendlyMessage } from "../friendly-error";
import type { AuthServiceI, AuthResult, SessionResult } from "./auth.interface";
import type { User } from "@supabase/supabase-js";

// Supabase Auth requires an email internally. Accounts in this app only
// ever expose a username + password, so we build a hidden, deterministic
// synthetic email from the username instead of asking for a real one.
// Supabase's signup validation does a real deliverability/MX check on
// the domain, so made-up domains (bar-inventory.local, etc.) get
// rejected outright — only a domain that genuinely has mail servers
// passes. gmail.com always will. No mail is ever actually sent here:
// "Confirm email" must stay disabled (see README), so this address is
// never contacted by Supabase or anyone else.
const SYNTHETIC_EMAIL_DOMAIN = "gmail.com";

function toSyntheticEmail(username: string): string {
    return `${username.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

function mapUser(user: User | null | undefined): { id: string; username: string } | null {
    if (!user) return null;
    const username = (user.user_metadata?.username as string | undefined) ?? user.email?.split("@")[0] ?? "";
    return { id: user.id, username };
}

class AuthService implements AuthServiceI {
    async signup(username: string, password: string): Promise<AuthResult> {
        const { data, error } = await supabase.auth.signUp({
            email: toSyntheticEmail(username),
            password,
            options: { data: { username } },
        });
        if (error) return { user: null, error: toFriendlyMessage(error, error.message) };
        return { user: mapUser(data.user), error: null };
    }

    async signin(username: string, password: string): Promise<AuthResult> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: toSyntheticEmail(username),
            password,
        });
        if (error) return { user: null, error: toFriendlyMessage(error, error.message) };
        return { user: mapUser(data.user), error: null };
    }

    async signout(): Promise<{ error: string | null }> {
        const { error } = await supabase.auth.signOut();
        return { error: error?.message ?? null };
    }

    async getSession(): Promise<SessionResult> {
        const { data } = await supabase.auth.getSession();
        return { user: mapUser(data.session?.user) };
    }

    onAuthStateChange(callback: (user: { id: string; username: string } | null) => void): () => void {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            callback(mapUser(session?.user));
        });
        return () => data.subscription.unsubscribe();
    }
}

export const authService = new AuthService();
