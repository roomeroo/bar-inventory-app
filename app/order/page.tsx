'use client'
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { IoCopyOutline, IoDownloadOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline } from "react-icons/io5";
import { useAuth } from "../lib/services/auth/auth-context";
import { itemsService } from "../lib/services/items/items.service";
import { ordersService } from "../lib/services/orders/orders.service";
import { downloadShoppingList, copyShoppingListToClipboard, type ShoppingListLine } from "../lib/download-shopping-list";
import QuantityStepper from "../components/QuantityStepper";
import type { Item } from "../lib/services/items/items.interface";

function toLines(items: Item[]): ShoppingListLine[] {
    return items.map((item) => ({ name: item.name, quantity: item.needed_quantity, unit: item.unit }));
}

export default function OrderPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<Item[]>([]);
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
                const data = await itemsService.list(user!.id);
                if (ignore) return;
                setItems(data.filter((item) => item.needed_quantity > 0));
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

    function setNeeded(itemId: string, quantity: number) {
        if (quantity <= 0) {
            removeLine(itemId);
            return;
        }
        setItems((current) => current.map((i) => (i.id === itemId ? { ...i, needed_quantity: quantity } : i)));
        itemsService.setNeeded(itemId, quantity).then(({ error }) => {
            if (error) {
                toast.error(error);
                setReloadKey((k) => k + 1);
            }
        });
    }

    function removeLine(itemId: string) {
        setItems((current) => current.filter((i) => i.id !== itemId));
        itemsService.clearNeeded(itemId).then(({ error }) => {
            if (error) {
                toast.error(error);
                setReloadKey((k) => k + 1);
            }
        });
    }

    async function handleCopy() {
        try {
            await copyShoppingListToClipboard(new Date(), toLines(items));
            toast.success("Copiado al portapapeles");
        } catch {
            toast.error("No se pudo copiar.");
        }
    }

    function handleDownload() {
        downloadShoppingList(new Date(), toLines(items));
    }

    async function handleConfirm() {
        if (!user || items.length === 0) return;

        setSubmitting(true);
        const lines = items.map((item) => ({ item, quantity: item.needed_quantity }));
        const { error } = await ordersService.confirmOrder(user.id, lines);
        setSubmitting(false);

        if (error) {
            toast.error(error);
            return;
        }
        toast.success("Pedido guardado en el historial");
        setConfirmedOrder({ date: new Date(), lines: toLines(items) });
        setItems([]);
    }

    if (confirmedOrder) {
        return (
            <main className="flex flex-col gap-6 p-6 sm:p-8">
                <div className="pt-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Pedido</p>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Pedido marcado</h1>
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
                    Descargar lista (.txt)
                </button>
                <p className="text-xs text-center text-gray-500 dark:text-zinc-400">
                    También puedes volver a descargarlo luego desde Historial.
                </p>
                <button
                    onClick={() => { setConfirmedOrder(null); setReloadKey((k) => k + 1); }}
                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 self-center"
                >
                    Volver al pedido
                </button>
            </main>
        );
    }

    return (
        <main className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Pedido</p>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Lo que hace falta pedir</h1>
            </div>

            {error ? (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-700 dark:text-red-300">No se pudo cargar el pedido.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Reintentar
                    </button>
                </div>
            ) : loading ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">Cargando...</p>
            ) : items.length === 0 ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">
                    Nada marcado todavía. Ve a Artículos y marca las cantidades que hacen falta.
                </p>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-4"
                            >
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-base text-gray-900 dark:text-zinc-50 truncate">{item.name}</span>
                                    <span className="text-sm text-gray-500 dark:text-zinc-400">
                                        {item.category ?? "Sin categoría"} · {item.unit}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <QuantityStepper value={item.needed_quantity} unit={item.unit} onChange={(q) => setNeeded(item.id, q)} />
                                    <button
                                        onClick={() => removeLine(item.id)}
                                        aria-label="Quitar del pedido"
                                        className="text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                                    >
                                        <IoCloseCircleOutline className="text-xl" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleCopy}
                            className="flex items-center justify-center gap-2 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 font-semibold rounded-xl py-3 text-sm"
                        >
                            <IoCopyOutline className="text-lg" />
                            Copiar
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center justify-center gap-2 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 font-semibold rounded-xl py-3 text-sm"
                        >
                            <IoDownloadOutline className="text-lg" />
                            Descargar .txt
                        </button>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base"
                    >
                        <IoCheckmarkCircleOutline className="text-xl" />
                        {submitting ? "Marcando..." : "Marcar como pedido"}
                    </button>
                </div>
            )}
        </main>
    );
}
