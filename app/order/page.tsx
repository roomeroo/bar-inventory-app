'use client'
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../lib/services/auth/auth-context";
import { itemsService } from "../lib/services/items/items.service";
import { isLow } from "../lib/services/items/low-stock";
import { ordersService } from "../lib/services/orders/orders.service";
import { downloadShoppingList, type ShoppingListLine } from "../lib/download-shopping-list";
import type { Item } from "../lib/services/items/items.interface";

export default function OrderPage() {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<Item[]>([]);
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [removed, setRemoved] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState<{ date: Date; lines: ShoppingListLine[] } | null>(null);

    useEffect(() => {
        if (!user) return;
        let ignore = false;

        async function load() {
            setLoading(true);
            setError(false);
            try {
                const items = await itemsService.list(user!.id);
                if (ignore) return;
                // Items that already have a pending order (expected_quantity set)
                // are excluded here even if still technically "low" — they're
                // already in flight and shouldn't be re-ordered before the next count.
                const lowStock = items.filter((item) => item.expected_quantity == null && isLow(item));
                setCandidates(lowStock);
                const initial: Record<string, string> = {};
                for (const item of lowStock) {
                    initial[item.id] = String(Math.max(item.min_stock - item.quantity, 1));
                }
                setQuantities(initial);
                setLoading(false);
            } catch {
                if (ignore) return;
                setError(true);
                setLoading(false);
            }
        }

        load();
        return () => { ignore = true; };
    }, [user, reloadKey]);

    const visible = candidates.filter((item) => !removed.has(item.id));

    async function handleConfirm() {
        if (!user) return;
        if (visible.length === 0) return;

        setSubmitting(true);
        const lines = visible.map((item) => ({
            item,
            quantity: Number(quantities[item.id]) || 1,
        }));
        const { error } = await ordersService.confirmOrder(user.id, lines);
        setSubmitting(false);

        if (error) {
            toast.error(error);
            return;
        }
        toast.success("Order saved to history");
        setConfirmedOrder({
            date: new Date(),
            lines: lines.map(({ item, quantity }) => ({ name: item.name, quantity, unit: item.unit })),
        });
        setCandidates([]);
    }

    if (confirmedOrder) {
        return (
            <main className="flex flex-col gap-6 p-6 sm:p-8">
                <div className="pt-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Order</p>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Order placed</h1>
                </div>
                <div className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-5 flex flex-col gap-2">
                    {confirmedOrder.lines.map((line) => (
                        <p key={line.name} className="text-sm text-gray-700 dark:text-zinc-300">
                            <span className="font-medium">{line.name}</span>: {line.quantity} {line.unit}
                        </p>
                    ))}
                </div>
                <button
                    onClick={() => downloadShoppingList(confirmedOrder.date, confirmedOrder.lines)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 text-base"
                >
                    Download shopping list (.txt)
                </button>
                <p className="text-xs text-center text-gray-500 dark:text-zinc-400">
                    You can also re-download it later from History → Orders.
                </p>
                <button
                    onClick={() => { setConfirmedOrder(null); setReloadKey((k) => k + 1); }}
                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 self-center"
                >
                    Back to order list
                </button>
            </main>
        );
    }

    return (
        <main className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Order</p>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Low stock items</h1>
            </div>

            {error ? (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-700 dark:text-red-300">Could not load low stock items.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Try again
                    </button>
                </div>
            ) : loading ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">Loading...</p>
            ) : visible.length === 0 ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">Nothing to order right now.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        {visible.map((item) => (
                            <div
                                key={item.id}
                                className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-5 flex items-center justify-between gap-4"
                            >
                                <div className="flex flex-col">
                                    <span className="font-semibold text-base text-gray-900 dark:text-zinc-50">{item.name}</span>
                                    <span className="text-sm text-gray-600 dark:text-zinc-400">
                                        {item.category ?? "Uncategorized"} · have {item.quantity} {item.unit} (min {item.min_stock})
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-20 rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2.5 text-base text-right text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={quantities[item.id] ?? ""}
                                        onChange={(e) => setQuantities({ ...quantities, [item.id]: e.target.value })}
                                    />
                                    <button
                                        onClick={() => setRemoved(new Set(removed).add(item.id))}
                                        className="text-sm font-medium text-gray-500 dark:text-zinc-400"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base mt-2"
                    >
                        {submitting ? "Placing order..." : "Confirm order"}
                    </button>
                </div>
            )}
        </main>
    );
}
