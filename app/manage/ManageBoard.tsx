'use client'
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Link from "next/link";
import { IoAddOutline, IoArrowBack } from "react-icons/io5";
import { useAuth } from "../lib/services/auth/auth-context";
import { itemsService } from "../lib/services/items/items.service";
import { categoriesService } from "../lib/services/categories/categories.service";
import { getBarId } from "../lib/services/bar/bar.service";
import { useRealtimeRefresh } from "../lib/hooks/useRealtimeRefresh";
import CategoryColumn, { type BoardColumn } from "./CategoryColumn";
import ArticleCard, { type EditState } from "./ArticleCard";
import type { Item } from "../lib/services/items/items.interface";

const UNCATEGORIZED = "__uncategorized__";

export default function ManageBoard() {
    const { user } = useAuth();
    const [barId, setBarId] = useState<string | null>(null);
    const [columns, setColumns] = useState<BoardColumn[]>([]);
    const [units, setUnits] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [activeItem, setActiveItem] = useState<Item | null>(null);
    const [addingCategory, setAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editState, setEditState] = useState<EditState | null>(null);
    const [savingItem, setSavingItem] = useState(false);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    function toggleCollapse(columnId: string) {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(columnId)) next.delete(columnId);
            else next.add(columnId);
            return next;
        });
    }

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    useEffect(() => {
        if (!user) return;
        let ignore = false;

        async function load() {
            setLoading(true);
            setError(false);
            try {
                const [id, categories, items, unitList] = await Promise.all([
                    getBarId(user!.id),
                    categoriesService.list(user!.id),
                    itemsService.list(user!.id),
                    itemsService.listUnits(user!.id),
                ]);
                if (ignore) return;

                const byCategory = new Map<string, Item[]>();
                for (const item of items) {
                    const key = item.category_id ?? UNCATEGORIZED;
                    (byCategory.get(key) ?? byCategory.set(key, []).get(key)!).push(item);
                }
                const built: BoardColumn[] = categories.map((c) => ({
                    id: c.id,
                    name: c.name,
                    items: byCategory.get(c.id) ?? [],
                    deletable: true,
                    renamable: true,
                }));
                built.push({
                    id: UNCATEGORIZED,
                    name: "Uncategorized",
                    items: byCategory.get(UNCATEGORIZED) ?? [],
                    deletable: false,
                    renamable: false,
                });

                setBarId(id);
                setColumns(built);
                setUnits(unitList);
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

    // Paused mid-drag: a background refetch would replace `columns` out
    // from under the active drag gesture and dnd-kit's sortable state.
    useRealtimeRefresh(barId, ["article", "category"], () => setReloadKey((k) => k + 1), {
        paused: activeItem !== null,
    });

    function findColumn(id: string): BoardColumn | undefined {
        return columns.find((c) => c.id === id || c.items.some((i) => i.id === id));
    }

    function handleDragStart(event: DragStartEvent) {
        const id = String(event.active.id);
        const col = findColumn(id);
        setActiveItem(col?.items.find((i) => i.id === id) ?? null);
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;
        const activeId = String(active.id);
        const overId = String(over.id);
        if (activeId === overId) return;

        const activeColumn = findColumn(activeId);
        const overColumn = findColumn(overId);
        if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

        // Computed against the latest `prev`, not the outer closure's
        // `columns` — several onDragOver calls for the same transition can
        // land in one React batch (e.g. a fast drag firing more pointermove
        // events than there are renders to react to them), so this has to
        // be idempotent: always remove the moving item from every column
        // first, then insert it exactly once, rather than trusting that
        // it's still only in its original column.
        setColumns((prev) => {
            const moving = prev.flatMap((c) => c.items).find((i) => i.id === activeId);
            if (!moving) return prev;

            const overCol = prev.find((c) => c.id === overColumn.id);
            const overIndex = overCol?.items.findIndex((i) => i.id === overId) ?? -1;
            const insertAt = overIndex >= 0 ? overIndex : overCol?.items.length ?? 0;

            return prev.map((col) => {
                const withoutMoving = col.items.filter((i) => i.id !== activeId);
                if (col.id !== overColumn.id) return { ...col, items: withoutMoving };
                const next = [...withoutMoving];
                next.splice(Math.min(insertAt, next.length), 0, moving);
                return { ...col, items: next };
            });
        });
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveItem(null);
        if (!over) return;
        const activeId = String(active.id);
        const overId = String(over.id);

        const activeColumn = findColumn(activeId);
        if (!activeColumn) return;

        let finalItems = activeColumn.items;
        if (activeId !== overId) {
            const overColumn = findColumn(overId);
            if (overColumn && overColumn.id === activeColumn.id) {
                const oldIndex = activeColumn.items.findIndex((i) => i.id === activeId);
                const newIndex = activeColumn.items.findIndex((i) => i.id === overId);
                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    finalItems = arrayMove(activeColumn.items, oldIndex, newIndex);
                    setColumns((prev) => prev.map((c) => (c.id === activeColumn.id ? { ...c, items: finalItems } : c)));
                }
            }
        }

        const categoryId = activeColumn.id === UNCATEGORIZED ? null : activeColumn.id;
        const orderedIds = finalItems.map((i) => i.id);
        itemsService.moveToCategory(activeId, categoryId, orderedIds).then(({ error }) => {
            if (error) {
                toast.error(error);
                setReloadKey((k) => k + 1);
            }
        });
    }

    async function handleAddCategory() {
        if (!user || !newCategoryName.trim()) return;
        const { category, error } = await categoriesService.create(user.id, newCategoryName.trim());
        if (error || !category) {
            toast.error(error ?? "Could not create the category.");
            return;
        }
        setColumns((prev) => [
            ...prev.slice(0, -1),
            { id: category.id, name: category.name, items: [], deletable: true, renamable: true },
            prev[prev.length - 1],
        ]);
        setNewCategoryName("");
        setAddingCategory(false);
    }

    function handleRenameCategory(columnId: string, name: string) {
        setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name } : c)));
        categoriesService.rename(columnId, name).then(({ error }) => {
            if (error) {
                toast.error(error);
                setReloadKey((k) => k + 1);
            }
        });
    }

    async function handleDeleteCategory(column: BoardColumn) {
        if (!window.confirm(`Delete category "${column.name}"? Its items will move to "Uncategorized".`)) return;
        const { error } = await categoriesService.remove(column.id);
        if (error) {
            toast.error(error);
            return;
        }
        setColumns((prev) => {
            const withoutColumn = prev.filter((c) => c.id !== column.id);
            return withoutColumn.map((c) =>
                c.id === UNCATEGORIZED ? { ...c, items: [...c.items, ...column.items] } : c
            );
        });
    }

    async function handleAddItem(columnId: string, name: string, unit: string) {
        if (!user) return;
        const categoryId = columnId === UNCATEGORIZED ? null : columnId;
        const { item, error } = await itemsService.create(user.id, { name, unit, category_id: categoryId });
        if (error || !item) {
            toast.error(error ?? "Could not add the item.");
            return;
        }
        setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, items: [...c.items, item] } : c)));
    }

    function startEditItem(item: Item) {
        setEditingItemId(item.id);
        setEditState({ name: item.name, unit: item.unit });
    }

    async function saveEditItem() {
        if (!user || !editingItemId || !editState) return;
        if (!editState.name.trim()) {
            toast.error("Name is required.");
            return;
        }
        setSavingItem(true);
        const { error } = await itemsService.update(user.id, editingItemId, {
            name: editState.name.trim(),
            unit: editState.unit.trim() || "unit",
        });
        setSavingItem(false);
        if (error) {
            toast.error(error);
            return;
        }
        setColumns((prev) => prev.map((c) => ({
            ...c,
            items: c.items.map((i) => (i.id === editingItemId ? { ...i, name: editState.name.trim(), unit: editState.unit.trim() || "unit" } : i)),
        })));
        setEditingItemId(null);
        setEditState(null);
    }

    async function deleteItem(item: Item) {
        if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return;
        const { error } = await itemsService.remove(item.id);
        if (error) {
            toast.error(error);
            return;
        }
        setColumns((prev) => prev.map((c) => ({ ...c, items: c.items.filter((i) => i.id !== item.id) })));
    }

    if (loading) {
        return <div className="p-8"><p className="text-base text-gray-500 dark:text-zinc-400">Loading board...</p></div>;
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-700 dark:text-red-300">Could not load the board.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-6 h-full">
            <div className="flex items-center gap-3 pt-2">
                <Link href="/" aria-label="Back to Items" className="text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400">
                    <IoArrowBack className="text-xl" />
                </Link>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Manage</p>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Categories and items</h1>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveItem(null)}
            >
                <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
                    {columns.map((column) => (
                        <CategoryColumn
                            key={column.id}
                            column={column}
                            units={units}
                            editingItemId={editingItemId}
                            editState={editState}
                            savingItem={savingItem}
                            collapsed={collapsed.has(column.id)}
                            onToggleCollapse={() => toggleCollapse(column.id)}
                            onRename={(name) => handleRenameCategory(column.id, name)}
                            onDeleteColumn={() => handleDeleteCategory(column)}
                            onStartEditItem={startEditItem}
                            onChangeEditItem={setEditState}
                            onSaveEditItem={saveEditItem}
                            onCancelEditItem={() => { setEditingItemId(null); setEditState(null); }}
                            onDeleteItem={deleteItem}
                            onAddItem={(name, unit) => handleAddItem(column.id, name, unit)}
                        />
                    ))}

                    <div className="w-64 shrink-0">
                        {addingCategory ? (
                            <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-3 flex flex-col gap-2">
                                <input
                                    autoFocus
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                                    placeholder="Category name"
                                    className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleAddCategory} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-1.5 text-xs">Add</button>
                                    <button onClick={() => { setAddingCategory(false); setNewCategoryName(""); }} className="flex-1 border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 font-semibold rounded-lg py-1.5 text-xs">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setAddingCategory(true)}
                                className="flex items-center justify-center gap-1.5 w-full text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-2xl py-3"
                            >
                                <IoAddOutline className="text-lg" />
                                Add category
                            </button>
                        )}
                    </div>
                </div>

                <DragOverlay>
                    {activeItem && (
                        <ArticleCard
                            item={activeItem}
                            units={units}
                            isEditing={false}
                            edit={null}
                            saving={false}
                            onStartEdit={() => {}}
                            onChangeEdit={() => {}}
                            onSaveEdit={() => {}}
                            onCancelEdit={() => {}}
                            onDelete={() => {}}
                        />
                    )}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
