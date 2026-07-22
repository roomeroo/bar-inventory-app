'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { IoArrowBack } from "react-icons/io5";
import { useAuth } from "../../lib/services/auth/auth-context";
import { itemsService } from "../../lib/services/items/items.service";
import { inventoryService } from "../../lib/services/inventory/inventory.service";
import type { Item } from "../../lib/services/items/items.interface";

export default function InventoryCountPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<Item[]>([]);
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        let ignore = false;

        async function load() {
            setLoading(true);
            setError(false);
            try {
                const data = await itemsService.list(user!.id);
                if (ignore) return;
                setItems(data);
                // Prefill with the expected quantity when a prior order is
                // still pending, otherwise start from the last known count.
                const initial: Record<string, string> = {};
                for (const item of data) {
                    const prefill = item.expected_quantity ?? item.quantity;
                    initial[item.id] = String(prefill);
                }
                setCounts(initial);
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

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        const entries = items.map((item) => ({
            item,
            quantity: Number(counts[item.id]) || 0,
        }));
        const { error } = await inventoryService.saveCount(user.id, entries);
        setSaving(false);

        if (error) {
            toast.error(error);
            return;
        }
        toast.success("Inventory count saved");
        router.push("/");
    }

    return (
        <main className="flex flex-col gap-6 p-5">
            <div className="flex items-center gap-3 pt-3">
                <Link href="/" className="text-gray-400 dark:text-zinc-500">
                    <IoArrowBack className="text-xl" />
                </Link>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">Start inventory</h1>
            </div>

            {error ? (
                <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-600 dark:text-red-300">Could not load items.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-600 dark:text-red-300">
                        Try again
                    </button>
                </div>
            ) : loading ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500">Loading items...</p>
            ) : items.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500">
                    No items yet. <Link href="/inventory/add" className="text-blue-500 font-semibold">Add one</Link> first.
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex items-center justify-between gap-4"
                        >
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm text-gray-800 dark:text-zinc-100">{item.name}</span>
                                <span className="text-xs text-gray-400 dark:text-zinc-500">
                                    {item.category ?? "Uncategorized"} · was {item.quantity} {item.unit}
                                    {item.expected_quantity != null && (
                                        <> · ordered {item.pending_order_amount} to reach {item.expected_quantity}</>
                                    )}
                                </span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                className="w-20 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-right text-gray-800 dark:text-zinc-100"
                                value={counts[item.id] ?? ""}
                                onChange={(e) => setCounts({ ...counts, [item.id]: e.target.value })}
                            />
                        </div>
                    ))}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 mt-2"
                    >
                        {saving ? "Saving..." : "Save count"}
                    </button>
                </div>
            )}
        </main>
    );
}
