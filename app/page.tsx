'use client'
import { useEffect, useState } from "react";
import Link from "next/link";
import { BiWine } from "react-icons/bi";
import { LuCalendarClock } from "react-icons/lu";
import { CiBoxes, CiBookmarkCheck } from "react-icons/ci";
import { VscDebugStart } from "react-icons/vsc";
import { IoListOutline } from "react-icons/io5";
import { useAuth } from "./lib/services/auth/auth-context";
import { itemsService } from "./lib/services/items/items.service";
import { isLow } from "./lib/services/items/low-stock";
import { inventoryService } from "./lib/services/inventory/inventory.service";
import { ordersService } from "./lib/services/orders/orders.service";

function formatDate(value: string | null): string {
    if (!value) return "Never";
    return new Date(value).toLocaleDateString();
}

export default function Home() {
    const { user } = useAuth();
    const [totalArticles, setTotalArticles] = useState(0);
    const [pendingArticles, setPendingArticles] = useState(0);
    const [lastInventoryUpdate, setLastInventoryUpdate] = useState<string | null>(null);
    const [lastOrderDate, setLastOrderDate] = useState<string | null>(null);
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
                const [items, lastSnapshot, lastOrder] = await Promise.all([
                    itemsService.list(user!.id),
                    inventoryService.getLastSnapshotDate(user!.id),
                    ordersService.getLastOrderDate(user!.id),
                ]);
                if (ignore) return;
                setTotalArticles(items.length);
                setPendingArticles(items.filter(isLow).length);
                setLastInventoryUpdate(lastSnapshot);
                setLastOrderDate(lastOrder);
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
            {/* Header */}
            <div className="flex items-center gap-3 pt-3">
                <div className="bg-blue-600 rounded-2xl p-2.5">
                    <BiWine className="text-2xl text-white" />
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Inventory</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-zinc-100">@{user?.username}</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-600 dark:text-red-300">Could not load your inventory.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-600 dark:text-red-300">
                        Try again
                    </button>
                </div>
            )}

            {/* Iniciar inventario */}
            <Link
                href="/inventory/count"
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex gap-4 justify-center items-center"
            >
                <VscDebugStart className="text-xl text-blue-500" />
                <p className="text-xl font-bold text-blue-500">Start inventory</p>
            </Link>

            {/* Grid de estadisticas */}
            <div className="grid grid-cols-2 gap-3">
                {/* Último inventario */}
                <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2">
                    <LuCalendarClock className="text-xl text-blue-500" />
                    <p className="text-xs text-gray-400 dark:text-zinc-500">Last update</p>
                    <p className="font-semibold text-sm text-gray-800 dark:text-zinc-100">
                        {loading ? "..." : formatDate(lastInventoryUpdate)}
                    </p>
                </div>

                {/* Artículos totales */}
                <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2">
                    <CiBoxes className="text-xl text-blue-500" />
                    <p className="text-xs text-gray-400 dark:text-zinc-500">Total articles</p>
                    <p className="font-semibold text-sm text-gray-800 dark:text-zinc-100">
                        {loading ? "..." : totalArticles}
                    </p>
                </div>

                {/* Pedidos pendientes */}
                <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2">
                    <CiBoxes className="text-xl text-orange-400" />
                    <p className="text-xs text-gray-400 dark:text-zinc-500">Pending articles</p>
                    <p className="font-semibold text-sm text-gray-800 dark:text-zinc-100">
                        {loading ? "..." : pendingArticles}
                    </p>
                </div>

                {/* Último pedido */}
                <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2">
                    <CiBookmarkCheck className="text-xl text-green-500" />
                    <p className="text-xs text-gray-400 dark:text-zinc-500">Last order</p>
                    <p className="font-semibold text-sm text-gray-800 dark:text-zinc-100">
                        {loading ? "..." : formatDate(lastOrderDate)}
                    </p>
                </div>
            </div>

            <Link href="/inventory/articles" className="flex items-center justify-center gap-2 text-blue-500 font-semibold py-2">
                <IoListOutline className="text-xl" />
                Manage items
            </Link>
        </main>
    );
}
