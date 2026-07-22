'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "../lib/services/auth/auth-context";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export interface AuthFormProps {
    mode: "login" | "signup"
}

export default function AuthForm({ mode }: AuthFormProps) {
    const { signin, signup } = useAuth();
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const normalized = username.trim().toLowerCase();
        if (!USERNAME_PATTERN.test(normalized)) {
            toast.error("Username must be 3-20 characters: letters, numbers, underscore.");
            return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setSubmitting(true);
        const { error } = mode === "signup"
            ? await signup(normalized, password)
            : await signin(normalized, password);
        setSubmitting(false);

        if (error) {
            toast.error(error);
            return;
        }
        router.push("/");
    }

    const isSignup = mode === "signup";

    return (
        <main className="flex flex-col gap-6 p-5 pt-16">
            <div className="flex flex-col gap-1 items-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Bar Inventory</p>
                <h1 className="text-xl font-semibold text-gray-800 dark:text-zinc-100">
                    {isSignup ? "Create account" : "Sign in"}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm text-gray-500 dark:text-zinc-400">
                    Username
                    <input
                        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-gray-800 dark:text-zinc-100"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoCapitalize="off"
                        autoCorrect="off"
                        placeholder="bar_ivan"
                        required
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-500 dark:text-zinc-400">
                    Password
                    <input
                        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-gray-800 dark:text-zinc-100"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </label>

                <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3"
                >
                    {submitting ? "Please wait..." : isSignup ? "Sign up" : "Sign in"}
                </button>
            </form>

            <p className="text-center text-sm text-gray-400 dark:text-zinc-500">
                {isSignup ? (
                    <>Already have an account? <Link href="/login" className="text-blue-500 font-semibold">Sign in</Link></>
                ) : (
                    <>Don&apos;t have an account? <Link href="/signup" className="text-blue-500 font-semibold">Sign up</Link></>
                )}
            </p>
        </main>
    );
}
