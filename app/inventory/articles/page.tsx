'use client'
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { IoArrowBack, IoAddCircleOutline, IoReorderThree } from "react-icons/io5";
import { useAuth } from "../../lib/services/auth/auth-context";
import { itemsService } from "../../lib/services/items/items.service";
import { isLow } from "../../lib/services/items/low-stock";
import { inventoryService } from "../../lib/services/inventory/inventory.service";
import { useDragReorder } from "../../lib/hooks/useDragReorder";
import ComboBox from "../../components/ComboBox";
import type { Item } from "../../lib/services/items/items.interface";
import type { MinStockSuggestion } from "../../lib/services/inventory/inventory.interface";

interface EditState {
    name: string
    category: string
    unit: string
    quantity: string
    min_stock: string
}

const editInputClass = "rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";

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
    const [suggestions, setSuggestions] = useState<Record<string, MinStockSuggestion>>({});

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
            // Best-effort: a trend suggestion is a nice-to-have, never worth
            // blocking or erroring the page over.
            inventoryService.getMinStockSuggestions(user!.id).then((s) => {
                if (!ignore) setSuggestions(s);
            }).catch(() => {});
        }

        load();
        return () => { ignore = true; };
    }, [user, reloadKey]);

    const units = useMemo(
        () => Array.from(new Set(items.map((i) => i.unit))).sort((a, b) => a.localeCompare(b)),
        [items]
    );
    const categories = useMemo(
        () => Array.from(new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c)))).sort((a, b) => a.localeCompare(b)),
        [items]
    );

    const { setItemRef, onPointerDown, onPointerMove, onPointerUp, dragStyle, draggedId } = useDragReorder(
        items,
        setItems,
        (orderedIds) => {
            itemsService.reorder(orderedIds).then(({ error }) => {
                if (error) {
                    toast.error(error);
                    setReloadKey((k) => k + 1);
                }
            });
        }
    );

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
        <main className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                    <Link href="/" className="text-gray-500 dark:text-zinc-400">
                        <IoArrowBack className="text-xl" />
                    </Link>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Manage items</h1>
                </div>
                <Link href="/inventory/add" className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    <IoAddCircleOutline className="text-lg" />
                    Add
                </Link>
            </div>

            {error ? (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-700 dark:text-red-300">Could not load items.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Try again
                    </button>
                </div>
            ) : loading ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">Loading items...</p>
            ) : items.length === 0 ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">
                    No items yet. <Link href="/inventory/add" className="text-blue-600 dark:text-blue-400 font-semibold">Add one</Link>.
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Drag the handle to arrange items in the order you want to count them.</p>
                    {items.map((item) => {
                        const isEditing = editingId === item.id;
                        return (
                            <div
                                key={item.id}
                                ref={setItemRef(item.id)}
                                style={dragStyle(item.id)}
                                className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-5 flex flex-col gap-3"
                            >
                                {isEditing && edit ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <input
                                                className={`col-span-2 ${editInputClass}`}
                                                value={edit.name}
                                                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                                                placeholder="Name"
                                            />
                                            <ComboBox
                                                className={editInputClass}
                                                value={edit.category}
                                                onChange={(value) => setEdit({ ...edit, category: value })}
                                                options={categories}
                                                placeholder="Category"
                                            />
                                            <ComboBox
                                                className={editInputClass}
                                                value={edit.unit}
                                                onChange={(value) => setEdit({ ...edit, unit: value })}
                                                options={units}
                                                placeholder="Unit"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                className={editInputClass}
                                                value={edit.quantity}
                                                onChange={(e) => setEdit({ ...edit, quantity: e.target.value })}
                                                placeholder="Quantity"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                className={editInputClass}
                                                value={edit.min_stock}
                                                onChange={(e) => setEdit({ ...edit, min_stock: e.target.value })}
                                                placeholder="Min stock"
                                            />
                                        </div>
                                        {(() => {
                                            const suggestion = suggestions[item.id];
                                            if (!suggestion) return null;
                                            if (Number(item.min_stock) === 0) return null;
                                            if (suggestion.suggested === Number(edit.min_stock)) return null;
                                            return (
                                                <p className="text-xs text-gray-500 dark:text-zinc-400 -mt-1.5">
                                                    Recent use suggests min {suggestion.suggested} {item.unit} (avg. of last {suggestion.cycles} counts) ·{" "}
                                                    <button
                                                        type="button"
                                                        onClick={() => setEdit({ ...edit, min_stock: String(suggestion.suggested) })}
                                                        className="font-semibold text-blue-600 dark:text-blue-400"
                                                    >
                                                        Use this
                                                    </button>
                                                </p>
                                            );
                                        })()}
                                        <div className="flex gap-2.5">
                                            <button
                                                onClick={() => saveEdit(item.id)}
                                                disabled={saving}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-sm"
                                            >
                                                {saving ? "Saving..." : "Save"}
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="flex-1 border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 font-semibold rounded-xl py-2.5 text-sm"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between gap-4">
                                        <button
                                            onPointerDown={(e) => onPointerDown(e, item.id)}
                                            onPointerMove={onPointerMove}
                                            onPointerUp={onPointerUp}
                                            onPointerCancel={onPointerUp}
                                            aria-label="Drag to reorder"
                                            style={{ touchAction: "none", cursor: draggedId === item.id ? "grabbing" : "grab" }}
                                            className="text-gray-400 dark:text-zinc-500 p-2 -m-2"
                                        >
                                            <IoReorderThree className="text-xl" />
                                        </button>
                                        <div className="flex flex-col flex-1">
                                            <span className="font-semibold text-base text-gray-900 dark:text-zinc-50">
                                                {item.name}
                                                {isLow(item) && (
                                                    <span className="ml-2 text-xs font-semibold text-orange-600 dark:text-orange-400">low</span>
                                                )}
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-zinc-400">
                                                {item.category ?? "Uncategorized"} · {item.quantity} {item.unit} (min {item.min_stock})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm font-semibold">
                                            <button onClick={() => startEdit(item)} className="text-blue-600 dark:text-blue-400">
                                                Edit
                                            </button>
                                            <button onClick={() => deleteItem(item)} className="text-red-600 dark:text-red-400">
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
