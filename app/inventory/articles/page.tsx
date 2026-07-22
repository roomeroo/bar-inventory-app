'use client'
import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { IoArrowBack, IoAddCircleOutline } from "react-icons/io5";
import { useAuth } from "../../lib/services/auth/auth-context";
import { itemsService } from "../../lib/services/items/items.service";
import { isLow } from "../../lib/services/items/low-stock";
import type { Item } from "../../lib/services/items/items.interface";

interface EditState {
    name: string
    category: string
    unit: string
    quantity: string
    min_stock: string
}

function toEditState(item: Item): EditState {
    return {
        name: item.name,
        category: item.category ?? "",
        unit: item.unit,
        quantity: String(item.quantity),
        min_stock: String(item.min_stock),
    };
}

export default function ArticlesPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [edit, setEdit] = useState<EditState | null>(null);
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

    function startEdit(item: Item) {
        setEditingId(item.id);
        setEdit(toEditState(item));
    }

    function cancelEdit() {
        setEditingId(null);
        setEdit(null);
    }

    async function saveEdit(itemId: string) {
        if (!user || !edit) return;
        if (!edit.name.trim()) {
            toast.error("Name is required.");
            return;
        }

        setSaving(true);
        const { error } = await itemsService.update(user.id, itemId, {
            name: edit.name.trim(),
            unit: edit.unit.trim() || "unit",
            category: edit.category.trim() || null,
            quantity: Number(edit.quantity) || 0,
            min_stock: Number(edit.min_stock) || 0,
        });
        setSaving(false);

        if (error) {
            toast.error(error);
            return;
        }
        toast.success("Item updated");
        cancelEdit();
        setReloadKey((k) => k + 1);
    }

    async function deleteItem(item: Item) {
        if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return;

        const { error } = await itemsService.remove(item.id);
        if (error) {
            toast.error(error);
            return;
        }
        toast.success("Item deleted");
        setItems((current) => current.filter((i) => i.id !== item.id));
    }

    return (
        <main className="flex flex-col gap-6 p-5">
            <div className="flex items-center justify-between gap-3 pt-3">
                <div className="flex items-center gap-3">
                    <Link href="/" className="text-gray-400 dark:text-zinc-500">
                        <IoArrowBack className="text-xl" />
                    </Link>
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">Manage items</h1>
                </div>
                <Link href="/inventory/add" className="flex items-center gap-1 text-blue-500 font-semibold text-sm">
                    <IoAddCircleOutline className="text-lg" />
                    Add
                </Link>
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
                    No items yet. <Link href="/inventory/add" className="text-blue-500 font-semibold">Add one</Link>.
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map((item) => {
                        const isEditing = editingId === item.id;
                        return (
                            <div
                                key={item.id}
                                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-3"
                            >
                                {isEditing && edit ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                className="col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-800 dark:text-zinc-100"
                                                value={edit.name}
                                                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                                                placeholder="Name"
                                            />
                                            <input
                                                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-800 dark:text-zinc-100"
                                                value={edit.category}
                                                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                                                placeholder="Category"
                                            />
                                            <input
                                                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-800 dark:text-zinc-100"
                                                value={edit.unit}
                                                onChange={(e) => setEdit({ ...edit, unit: e.target.value })}
                                                placeholder="Unit"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-800 dark:text-zinc-100"
                                                value={edit.quantity}
                                                onChange={(e) => setEdit({ ...edit, quantity: e.target.value })}
                                                placeholder="Quantity"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-800 dark:text-zinc-100"
                                                value={edit.min_stock}
                                                onChange={(e) => setEdit({ ...edit, min_stock: e.target.value })}
                                                placeholder="Min stock"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => saveEdit(item.id)}
                                                disabled={saving}
                                                className="flex-1 bg-blue-600 disabled:opacity-60 text-white font-semibold rounded-xl py-2 text-sm"
                                            >
                                                {saving ? "Saving..." : "Save"}
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="flex-1 border border-zinc-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 font-semibold rounded-xl py-2 text-sm"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm text-gray-800 dark:text-zinc-100">
                                                {item.name}
                                                {isLow(item) && (
                                                    <span className="ml-2 text-xs font-semibold text-orange-500">low</span>
                                                )}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-zinc-500">
                                                {item.category ?? "Uncategorized"} · {item.quantity} {item.unit} (min {item.min_stock})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-semibold">
                                            <button onClick={() => startEdit(item)} className="text-blue-500">
                                                Edit
                                            </button>
                                            <button onClick={() => deleteItem(item)} className="text-red-500">
                                                Delete
                                            </button>
                                        </div>
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
