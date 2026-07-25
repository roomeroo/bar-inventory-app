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
        <main className="flex flex-col gap-8 p-6 sm:p-10 pt-16 max-w-sm sm:max-w-md mx-auto">
            <div className="flex flex-col gap-2 items-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Bar Inventory</p>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
                    {isSignup ? "Create account" : "Sign in"}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300">
                    Username
                    <input
                        className="rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-base text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoCapitalize="off"
                        autoCorrect="off"
                        placeholder="username"
                        required
                    />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300">
                    Password
                    <input
                        className="rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-base text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base mt-2"
                >
                    {submitting ? "Please wait..." : isSignup ? "Sign up" : "Sign in"}
                </button>
            </form>

            <p className="text-center text-sm text-gray-600 dark:text-zinc-400">
                {isSignup ? (
                    <>Already have an account? <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold">Sign in</Link></>
                ) : (
                    <>Don&apos;t have an account? <Link href="/signup" className="text-blue-600 dark:text-blue-400 font-semibold">Sign up</Link></>
                )}
            </p>
        </main>
    );
}
