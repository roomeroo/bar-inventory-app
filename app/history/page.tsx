'use client'
import { useEffect, useState } from "react";
import { useAuth } from "../lib/services/auth/auth-context";
import { inventoryService } from "../lib/services/inventory/inventory.service";
import type { InventorySnapshot, InventorySnapshotItem } from "../lib/services/inventory/inventory.interface";

export default function HistoryPage() {
    const { user } = useAuth();
    const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
    const [itemsBySnapshot, setItemsBySnapshot] = useState<Record<string, InventorySnapshotItem[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!user) return;
        let ignore = false;

        async function load() {
            setLoading(true);
            setError(false);
            try {
                const [snapshots, items] = await Promise.all([
                    inventoryService.listSnapshots(user!.id),
                    inventoryService.listSnapshotItems(user!.id),
                ]);
                if (ignore) return;
                const grouped: Record<string, InventorySnapshotItem[]> = {};
                for (const item of items) {
                    (grouped[item.snapshot_id] ??= []).push(item);
                }
                setSnapshots(snapshots);
                setItemsBySnapshot(grouped);
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

    return (
        <main className="flex flex-col gap-6 p-5">
            <div className="pt-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">History</p>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">Past inventory counts</h1>
            </div>

            {error ? (
                <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-600 dark:text-red-300">Could not load history.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-600 dark:text-red-300">
                        Try again
                    </button>
                </div>
            ) : loading ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500">Loading...</p>
            ) : snapshots.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500">No inventory counts yet.</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {snapshots.map((snapshot) => {
                        const snapshotItems = itemsBySnapshot[snapshot.id] ?? [];
                        const lowCount = snapshotItems.filter((i) => i.is_low).length;
                        const resolvedOrders = snapshotItems.filter((i) => i.pending_order_amount != null);

                        return (
                            <div
                                key={snapshot.id}
                                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm text-gray-800 dark:text-zinc-100">
                                        {new Date(snapshot.created_at).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-zinc-500">
                                        {snapshotItems.length} items
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-zinc-500">
                                    {lowCount > 0 ? `${lowCount} flagged as low` : "All items at healthy levels"}
                                </p>
                                {resolvedOrders.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-1">
                                        {resolvedOrders.map((i) => (
                                            <p key={i.id} className="text-xs text-gray-500 dark:text-zinc-400">
                                                <span className="font-medium">{i.item_name}</span>: ordered {i.pending_order_amount} to reach {i.expected_quantity}, found {i.quantity}
                                                {i.is_low ? " (still low)" : " (ok)"}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
