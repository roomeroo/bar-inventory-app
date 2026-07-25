'use client'
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IoArrowBack, IoAddCircleOutline, IoReorderThree } from "react-icons/io5";
import { useAuth } from "../../lib/services/auth/auth-context";
import { itemsService } from "../../lib/services/items/items.service";
import { inventoryService } from "../../lib/services/inventory/inventory.service";
import { useDragReorder } from "../../lib/hooks/useDragReorder";
import ComboBox from "../../components/ComboBox";
import type { Item } from "../../lib/services/items/items.interface";

const inputClass = "rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-base text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300";

type Phase = "reorder" | "list" | "review";

function parseCount(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    if (Number.isNaN(n) || n < 0) return null;
    return n;
}

export default function InventoryCountPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [phase, setPhase] = useState<Phase>("reorder");
    const [listValues, setListValues] = useState<Record<string, string>>({});
    const [reviewValues, setReviewValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [newUnit, setNewUnit] = useState("unit");
    const [newMinStock, setNewMinStock] = useState("0");
    const [addingItem, setAddingItem] = useState(false);

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
                setShowAddForm(data.length === 0);
            } catch {
                if (ignore) return;
                setError(true);
                setLoading(false);
            }
        }

        load();
        return () => { ignore = true; };
    }, [user, reloadKey]);

    // Warn on an actual page unload (refresh/close tab) while a count is
    // in progress — losing a half-finished inventory count is exactly the
    // kind of accident this whole flow is meant to prevent.
    useEffect(() => {
        function handleBeforeUnload(e: BeforeUnloadEvent) {
            const hasProgress = Object.values(listValues).some((v) => v.trim() !== "")
                || Object.values(reviewValues).some((v) => v.trim() !== "");
            if ((phase === "list" || phase === "review") && hasProgress) {
                e.preventDefault();
            }
        }
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [phase, listValues, reviewValues]);

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

    const filledCount = items.filter((i) => parseCount(listValues[i.id] ?? "") !== null).length;
    const allListFilled = items.length > 0 && filledCount === items.length;

    function goBackLink() {
        const hasProgress = Object.values(listValues).some((v) => v.trim() !== "")
            || Object.values(reviewValues).some((v) => v.trim() !== "");
        if (hasProgress && !window.confirm("Leave now and this inventory count will be lost. Continue?")) {
            return;
        }
        router.push("/");
    }

    function handleListReview() {
        for (const item of items) {
            if (parseCount(listValues[item.id] ?? "") === null) {
                toast.error(`Enter a count for ${item.name}.`);
                return;
            }
        }
        setReviewValues(listValues);
        setPhase("review");
    }

    function handleBackToList() {
        setListValues(reviewValues);
        setPhase("list");
    }

    async function handleAddItem(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        if (!newName.trim()) {
            toast.error("Name is required.");
            return;
        }

        setAddingItem(true);
        const { item, error } = await itemsService.create(user.id, {
            name: newName.trim(),
            unit: newUnit.trim() || "unit",
            category: newCategory.trim() || null,
            quantity: 0,
            min_stock: Number(newMinStock) || 0,
        });
        setAddingItem(false);

        if (error || !item) {
            toast.error(error ?? "Could not add item.");
            return;
        }
        setItems((current) => [...current, item]);
        toast.success(`${item.name} added — you'll count it before finishing.`);
        setNewName("");
        setNewCategory("");
        setNewUnit("unit");
        setNewMinStock("0");
        setShowAddForm(false);
    }

    async function handleConfirmSave() {
        if (!user) return;

        const finalEntries: Record<string, number> = {};
        for (const item of items) {
            const n = parseCount(reviewValues[item.id] ?? "");
            if (n === null) {
                toast.error(`Enter a valid count for ${item.name}.`);
                return;
            }
            finalEntries[item.id] = n;
        }

        setSaving(true);
        const countEntries = items.map((item) => ({ item, quantity: finalEntries[item.id] }));
        const { error } = await inventoryService.saveCount(user.id, countEntries);
        setSaving(false);

        if (error) {
            toast.error(error);
            return;
        }
        toast.success("Inventory count saved");
        router.push("/");
    }

    const addItemForm = (
        <form onSubmit={handleAddItem} className="bg-blue-50 dark:bg-zinc-800 border border-blue-200 dark:border-zinc-700 rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-50">New item</p>
            <label className={labelClass}>
                Name
                <input className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Blue Gin" required />
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                    Category
                    <ComboBox className={inputClass} value={newCategory} onChange={setNewCategory} options={categories} placeholder="Spirits" />
                </label>
                <label className={labelClass}>
                    Unit
                    <ComboBox className={inputClass} value={newUnit} onChange={setNewUnit} options={units} placeholder="bottle" />
                </label>
            </div>
            <label className={labelClass}>
                Minimum stock
                <input className={inputClass} type="number" min="0" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)} />
            </label>
            <div className="flex gap-3">
                <button type="submit" disabled={addingItem} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-base">
                    {addingItem ? "Adding..." : "Add and continue counting"}
                </button>
                {items.length > 0 && (
                    <button type="button" onClick={() => setShowAddForm(false)} className="border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 font-semibold rounded-xl py-3 px-5 text-base">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );

    const addItemToggle = showAddForm ? addItemForm : (
        <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm py-2"
        >
            <IoAddCircleOutline className="text-lg" />
            Bought something new this week? Add it
        </button>
    );

    return (
        <main className="flex flex-col gap-6 p-6 sm:p-8 max-w-lg mx-auto">
            <div className="flex items-center gap-3 pt-2">
                <button onClick={goBackLink} className="text-gray-500 dark:text-zinc-400">
                    <IoArrowBack className="text-xl" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Start inventory</h1>
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
                <div className="flex flex-col gap-4">
                    <p className="text-base text-gray-500 dark:text-zinc-400">No items yet — add your first one to start counting.</p>
                    {addItemForm}
                </div>
            ) : phase === "reorder" ? (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                        Drag the handle to arrange items in the order you&apos;ll walk through them (optional) — this order is saved for next time too.
                    </p>
                    <div className="flex flex-col gap-3">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                ref={setItemRef(item.id)}
                                style={dragStyle(item.id)}
                                className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-4 flex items-center gap-4"
                            >
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
                                    <span className="font-medium text-base text-gray-900 dark:text-zinc-50">{item.name}</span>
                                    <span className="text-sm text-gray-600 dark:text-zinc-400">{item.category ?? "Uncategorized"}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setPhase("list")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 text-base mt-2">
                        Start counting
                    </button>
                </div>
            ) : phase === "list" ? (
                <div className="flex flex-col gap-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">{filledCount} of {items.length} counted</p>
                    <div className="flex flex-col gap-3">
                        {items.map((item) => (
                            <div key={item.id} className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-4 flex items-center justify-between gap-4">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-base text-gray-900 dark:text-zinc-50">{item.name}</span>
                                    <span className="text-sm text-gray-600 dark:text-zinc-400">
                                        {item.category ?? "Uncategorized"} · last {item.quantity} {item.unit}
                                        {item.expected_quantity != null && <> · ordered {item.pending_order_amount} to reach {item.expected_quantity}</>}
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-20 rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2.5 text-base text-right text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={listValues[item.id] ?? ""}
                                    onChange={(e) => setListValues({ ...listValues, [item.id]: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                        ))}
                    </div>

                    {addItemToggle}

                    <button
                        onClick={handleListReview}
                        disabled={!allListFilled}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3.5 text-base mt-2"
                    >
                        Review ({filledCount}/{items.length})
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-600 dark:text-zinc-400">Review before saving — click any number to fix it.</p>
                    <div className="flex flex-col gap-3">
                        {items.map((item) => (
                            <div key={item.id} className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-4 flex items-center justify-between gap-4">
                                <span className="font-medium text-base text-gray-900 dark:text-zinc-50">{item.name}</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-20 rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2.5 text-base text-right text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={reviewValues[item.id] ?? ""}
                                        onChange={(e) => setReviewValues({ ...reviewValues, [item.id]: e.target.value })}
                                    />
                                    <span className="text-sm text-gray-500 dark:text-zinc-400">{item.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleBackToList} disabled={saving} className="text-sm font-semibold text-blue-600 dark:text-blue-400 self-start">
                        ◀ Back to list
                    </button>
                    <button onClick={handleConfirmSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base">
                        {saving ? "Saving..." : "Confirm and save"}
                    </button>
                </div>
            )}
        </main>
    );
}
