'use client'
import { useEffect, useState } from "react";
import { useAuth } from "../lib/services/auth/auth-context";
import { inventoryService } from "../lib/services/inventory/inventory.service";
import { ordersService } from "../lib/services/orders/orders.service";
import { downloadShoppingList } from "../lib/download-shopping-list";
import type { InventorySnapshot, InventorySnapshotItem } from "../lib/services/inventory/inventory.interface";
import type { Order, OrderItemRecord } from "../lib/services/orders/orders.interface";

type Tab = "counts" | "orders";

export default function HistoryPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>("counts");
    const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
    const [itemsBySnapshot, setItemsBySnapshot] = useState<Record<string, InventorySnapshotItem[]>>({});
    const [orders, setOrders] = useState<Order[]>([]);
    const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItemRecord[]>>({});
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
                const [snapshots, snapshotItems, orders, orderItems] = await Promise.all([
                    inventoryService.listSnapshots(user!.id),
                    inventoryService.listSnapshotItems(user!.id),
                    ordersService.listOrders(user!.id),
                    ordersService.listOrderItems(user!.id),
                ]);
                if (ignore) return;

                const groupedSnapshots: Record<string, InventorySnapshotItem[]> = {};
                for (const item of snapshotItems) {
                    (groupedSnapshots[item.snapshot_id] ??= []).push(item);
                }
                const groupedOrders: Record<string, OrderItemRecord[]> = {};
                for (const line of orderItems) {
                    (groupedOrders[line.order_id] ??= []).push(line);
                }

                setSnapshots(snapshots);
                setItemsBySnapshot(groupedSnapshots);
                setOrders(orders);
                setItemsByOrder(groupedOrders);
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
        <main className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">History</p>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Past activity</h1>
            </div>

            <div className="flex rounded-2xl border border-gray-300 dark:border-zinc-600 p-1 gap-1 max-w-xs">
                <button
                    onClick={() => setTab("counts")}
                    className={tab === "counts"
                        ? "flex-1 rounded-xl bg-blue-600 text-white font-semibold py-2.5 text-sm"
                        : "flex-1 rounded-xl text-gray-600 dark:text-zinc-400 font-semibold py-2.5 text-sm"}
                >
                    Counts
                </button>
                <button
                    onClick={() => setTab("orders")}
                    className={tab === "orders"
                        ? "flex-1 rounded-xl bg-blue-600 text-white font-semibold py-2.5 text-sm"
                        : "flex-1 rounded-xl text-gray-600 dark:text-zinc-400 font-semibold py-2.5 text-sm"}
                >
                    Orders
                </button>
            </div>

            {error ? (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-700 dark:text-red-300">Could not load history.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Try again
                    </button>
                </div>
            ) : loading ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">Loading...</p>
            ) : tab === "counts" ? (
                snapshots.length === 0 ? (
                    <p className="text-base text-gray-500 dark:text-zinc-400">No inventory counts yet.</p>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {snapshots.map((snapshot) => {
                            const snapshotItems = itemsBySnapshot[snapshot.id] ?? [];
                            const lowCount = snapshotItems.filter((i) => i.is_low).length;
                            const resolvedOrders = snapshotItems.filter((i) => i.pending_order_amount != null);

                            return (
                                <div
                                    key={snapshot.id}
                                    className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-5 flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-base text-gray-900 dark:text-zinc-50">
                                            {new Date(snapshot.created_at).toLocaleString()}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-zinc-400">
                                            {snapshotItems.length} items
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                                        {lowCount > 0 ? `${lowCount} flagged as low` : "All items at healthy levels"}
                                    </p>
                                    {resolvedOrders.length > 0 && (
                                        <div className="flex flex-col gap-1.5 mt-1">
                                            {resolvedOrders.map((i) => (
                                                <p key={i.id} className="text-sm text-gray-700 dark:text-zinc-300">
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
                )
            ) : orders.length === 0 ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">No orders yet.</p>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {orders.map((order) => {
                        const lines = itemsByOrder[order.id] ?? [];
                        return (
                            <div
                                key={order.id}
                                className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-5 flex flex-col gap-2"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-base text-gray-900 dark:text-zinc-50">
                                        {new Date(order.created_at).toLocaleString()}
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-zinc-400">{lines.length} items</span>
                                </div>
                                <div className="flex flex-col gap-1.5 mt-1">
                                    {lines.map((line) => (
                                        <p key={line.id} className="text-sm text-gray-700 dark:text-zinc-300">
                                            <span className="font-medium">{line.item_name}</span>: {line.quantity} {line.unit}
                                        </p>
                                    ))}
                                </div>
                                <button
                                    onClick={() => downloadShoppingList(
                                        new Date(order.created_at),
                                        lines.map((l) => ({ name: l.item_name, quantity: l.quantity, unit: l.unit }))
                                    )}
                                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 self-start mt-1"
                                >
                                    Download (.txt)
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
