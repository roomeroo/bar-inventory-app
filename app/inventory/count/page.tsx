'use client'
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IoArrowBack, IoAddCircleOutline, IoChevronUp, IoChevronDown } from "react-icons/io5";
import { useAuth } from "../../lib/services/auth/auth-context";
import { itemsService } from "../../lib/services/items/items.service";
import { inventoryService } from "../../lib/services/inventory/inventory.service";
import ComboBox from "../../components/ComboBox";
import type { Item } from "../../lib/services/items/items.interface";

const inputClass = "rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-base text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300";

type Phase = "reorder" | "counting" | "list" | "review";
type Mode = "swipe" | "list";
const SWIPE_THRESHOLD = 100;

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
    const [mode, setMode] = useState<Mode>("swipe");
    const [index, setIndex] = useState(0);
    const [entries, setEntries] = useState<Record<string, number>>({});
    const [currentValue, setCurrentValue] = useState("");
    const [listValues, setListValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    // Swipe-card drag state (hand-rolled, no gesture library — pointer
    // events cover mouse + touch uniformly).
    const [dragX, setDragX] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [flying, setFlying] = useState<"left" | "right" | null>(null);
    const dragStartX = useRef(0);

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
            const hasListProgress = Object.values(listValues).some((v) => v.trim() !== "");
            if ((phase === "counting" || phase === "list") && (Object.keys(entries).length > 0 || hasListProgress)) {
                e.preventDefault();
            }
        }
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [phase, entries, listValues]);

    const units = useMemo(
        () => Array.from(new Set(items.map((i) => i.unit))).sort((a, b) => a.localeCompare(b)),
        [items]
    );
    const categories = useMemo(
        () => Array.from(new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c)))).sort((a, b) => a.localeCompare(b)),
        [items]
    );

    const currentItem = items[index];
    const isLastItem = index === items.length - 1;
    const filledCount = items.filter((i) => parseCount(listValues[i.id] ?? "") !== null).length;
    const allListFilled = items.length > 0 && filledCount === items.length;

    function goBackLink() {
        const hasListProgress = Object.values(listValues).some((v) => v.trim() !== "");
        const hasProgress = Object.keys(entries).length > 0 || index > 0 || currentValue.trim() !== "" || hasListProgress;
        if (hasProgress && !window.confirm("Leave now and this inventory count will be lost. Continue?")) {
            return;
        }
        router.push("/");
    }

    // Shared "confirm this item and move on" logic — used by the Next
    // button, the swipe-right gesture, and the fly-off animation alike,
    // so every path enforces the same "must enter a value" rule.
    function commitCurrentAndAdvance(): boolean {
        const n = parseCount(currentValue);
        if (n === null) {
            toast.error("Enter a count (0 or more) before continuing.");
            return false;
        }
        setEntries((e) => ({ ...e, [currentItem.id]: n }));
        if (isLastItem) {
            setPhase("review");
        } else {
            setIndex((i) => i + 1);
            setCurrentValue("");
        }
        return true;
    }

    function handleBack() {
        if (index === 0) return;
        const prevItem = items[index - 1];
        setIndex((i) => i - 1);
        setCurrentValue(entries[prevItem.id] != null ? String(entries[prevItem.id]) : "");
    }

    function triggerSwipeRight() {
        if (flying) return;
        const n = parseCount(currentValue);
        if (n === null) {
            toast.error("Enter a count (0 or more) before continuing.");
            setDragX(0);
            return;
        }
        setFlying("right");
        setTimeout(() => {
            commitCurrentAndAdvance();
            setFlying(null);
            setDragX(0);
        }, 200);
    }

    function triggerSwipeLeft() {
        if (flying || index === 0) {
            setDragX(0);
            return;
        }
        setFlying("left");
        setTimeout(() => {
            handleBack();
            setFlying(null);
            setDragX(0);
        }, 200);
    }

    function onCardPointerDown(e: React.PointerEvent) {
        if (flying) return;
        setDragging(true);
        dragStartX.current = e.clientX;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
    function onCardPointerMove(e: React.PointerEvent) {
        if (!dragging) return;
        setDragX(e.clientX - dragStartX.current);
    }
    function onCardPointerUp() {
        if (!dragging) return;
        setDragging(false);
        if (dragX > SWIPE_THRESHOLD) triggerSwipeRight();
        else if (dragX < -SWIPE_THRESHOLD) triggerSwipeLeft();
        else setDragX(0);
    }

    function handleEditFromReview() {
        if (mode === "list") {
            setPhase("list");
            return;
        }
        setPhase("counting");
        const lastItem = items[items.length - 1];
        setIndex(items.length - 1);
        setCurrentValue(entries[lastItem.id] != null ? String(entries[lastItem.id]) : "");
    }

    function handleListReview() {
        const newEntries: Record<string, number> = {};
        for (const item of items) {
            const n = parseCount(listValues[item.id] ?? "");
            if (n === null) {
                toast.error(`Enter a count for ${item.name}.`);
                return;
            }
            newEntries[item.id] = n;
        }
        setEntries(newEntries);
        setPhase("review");
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

    async function moveItem(idx: number, direction: -1 | 1) {
        const target = idx + direction;
        if (target < 0 || target >= items.length) return;

        const reordered = [...items];
        [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
        setItems(reordered);

        const { error } = await itemsService.reorder(reordered.map((i) => i.id));
        if (error) {
            toast.error(error);
            setReloadKey((k) => k + 1);
        }
    }

    async function handleConfirmSave() {
        if (!user) return;
        setSaving(true);
        const countEntries = items.map((item) => ({ item, quantity: entries[item.id] }));
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

    // Card transform: follows the finger/mouse while dragging, snaps back
    // to center if released below the threshold, or flies off-screen once
    // a swipe (or the equivalent button) is confirmed.
    const cardTransform = flying === "right"
        ? "translateX(600px) rotate(24deg)"
        : flying === "left"
            ? "translateX(-600px) rotate(-24deg)"
            : `translateX(${dragX}px) rotate(${dragX / 20}deg)`;
    const cardTransition = flying || !dragging ? "transform 0.2s ease-out" : "none";
    const confirmStampOpacity = Math.min(Math.max(dragX, 0) / SWIPE_THRESHOLD, 1);
    const backStampOpacity = Math.min(Math.max(-dragX, 0) / SWIPE_THRESHOLD, 1);

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
                    <div className="flex rounded-2xl border border-gray-300 dark:border-zinc-600 p-1 gap-1">
                        <button
                            onClick={() => setMode("swipe")}
                            className={mode === "swipe"
                                ? "flex-1 rounded-xl bg-blue-600 text-white font-semibold py-2.5 text-sm"
                                : "flex-1 rounded-xl text-gray-600 dark:text-zinc-400 font-semibold py-2.5 text-sm"}
                        >
                            🃏 Swipe cards
                        </button>
                        <button
                            onClick={() => setMode("list")}
                            className={mode === "list"
                                ? "flex-1 rounded-xl bg-blue-600 text-white font-semibold py-2.5 text-sm"
                                : "flex-1 rounded-xl text-gray-600 dark:text-zinc-400 font-semibold py-2.5 text-sm"}
                        >
                            📋 List
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                        Arrange items in the order you&apos;ll walk through them (optional) — this order is saved for next time too.
                    </p>
                    <div className="flex flex-col gap-3">
                        {items.map((item, idx) => (
                            <div key={item.id} className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-4 flex items-center gap-4">
                                <div className="flex flex-col">
                                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} aria-label="Move up" className="text-gray-400 dark:text-zinc-500 disabled:opacity-30">
                                        <IoChevronUp className="text-lg" />
                                    </button>
                                    <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} aria-label="Move down" className="text-gray-400 dark:text-zinc-500 disabled:opacity-30">
                                        <IoChevronDown className="text-lg" />
                                    </button>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className="font-medium text-base text-gray-900 dark:text-zinc-50">{item.name}</span>
                                    <span className="text-sm text-gray-600 dark:text-zinc-400">{item.category ?? "Uncategorized"}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => setPhase(mode === "swipe" ? "counting" : "list")}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 text-base mt-2"
                    >
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
            ) : phase === "review" ? (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-600 dark:text-zinc-400">Review before saving — nothing is written until you confirm.</p>
                    <div className="flex flex-col gap-3">
                        {items.map((item) => (
                            <div key={item.id} className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-4 flex items-center justify-between gap-4">
                                <span className="font-medium text-base text-gray-900 dark:text-zinc-50">{item.name}</span>
                                <span className="font-semibold text-base text-gray-900 dark:text-zinc-50">{entries[item.id]} {item.unit}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-2">
                        <button onClick={handleConfirmSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base">
                            {saving ? "Saving..." : "Confirm and save"}
                        </button>
                        <button onClick={handleEditFromReview} disabled={saving} className="border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 font-semibold rounded-xl py-3.5 px-5 text-base">
                            Edit
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">Item {index + 1} of {items.length} — swipe or use the buttons</p>

                    <div
                        onPointerDown={onCardPointerDown}
                        onPointerMove={onCardPointerMove}
                        onPointerUp={onCardPointerUp}
                        onPointerCancel={onCardPointerUp}
                        style={{ transform: cardTransform, transition: cardTransition, touchAction: "pan-y", cursor: dragging ? "grabbing" : "grab" }}
                        className="relative select-none bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col gap-4"
                    >
                        <span
                            style={{ opacity: confirmStampOpacity }}
                            className="pointer-events-none absolute top-4 right-4 rotate-12 rounded-lg border-4 border-green-500 px-3 py-1 text-lg font-extrabold uppercase text-green-500"
                        >
                            Confirm
                        </span>
                        <span
                            style={{ opacity: backStampOpacity }}
                            className="pointer-events-none absolute top-4 left-4 -rotate-12 rounded-lg border-4 border-gray-400 px-3 py-1 text-lg font-extrabold uppercase text-gray-400"
                        >
                            Back
                        </span>

                        <div className="flex flex-col gap-1">
                            <span className="font-semibold text-xl text-gray-900 dark:text-zinc-50">{currentItem.name}</span>
                            <span className="text-sm text-gray-600 dark:text-zinc-400">{currentItem.category ?? "Uncategorized"}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-zinc-700 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                                Last count: {currentItem.quantity} {currentItem.unit}
                            </span>
                            {currentItem.expected_quantity != null && (
                                <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-zinc-700 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-300">
                                    Ordered {currentItem.pending_order_amount} to reach {currentItem.expected_quantity}
                                </span>
                            )}
                        </div>

                        <label className={labelClass}>
                            Current count ({currentItem.unit})
                            <input
                                key={currentItem.id}
                                type="number"
                                min="0"
                                autoFocus
                                className={`${inputClass} text-lg`}
                                value={currentValue}
                                onChange={(e) => setCurrentValue(e.target.value)}
                                onPointerDown={(e) => e.stopPropagation()}
                                placeholder="0"
                            />
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={triggerSwipeLeft} disabled={index === 0} className="border border-gray-300 dark:border-zinc-600 disabled:opacity-40 text-gray-600 dark:text-zinc-400 font-semibold rounded-xl py-3.5 px-5 text-base">
                            Back
                        </button>
                        <button onClick={triggerSwipeRight} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 text-base">
                            {isLastItem ? "Review" : "Next"}
                        </button>
                    </div>

                    {addItemToggle}
                </div>
            )}
        </main>
    );
}
