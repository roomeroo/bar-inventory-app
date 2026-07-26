'use client'
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { IoTrashOutline, IoAddOutline } from "react-icons/io5";
import ComboBox from "../components/ComboBox";
import ArticleCard, { type EditState } from "./ArticleCard";
import type { Item } from "../lib/services/items/items.interface";

export interface BoardColumn {
    id: string
    name: string
    items: Item[]
    deletable: boolean
    renamable: boolean
}

interface CategoryColumnProps {
    column: BoardColumn
    units: string[]
    editingItemId: string | null
    editState: EditState | null
    savingItem: boolean
    onRename: (name: string) => void
    onDeleteColumn: () => void
    onStartEditItem: (item: Item) => void
    onChangeEditItem: (edit: EditState) => void
    onSaveEditItem: () => void
    onCancelEditItem: () => void
    onDeleteItem: (item: Item) => void
    onAddItem: (name: string, unit: string) => void
}

export default function CategoryColumn({
    column, units, editingItemId, editState, savingItem, onRename, onDeleteColumn,
    onStartEditItem, onChangeEditItem, onSaveEditItem, onCancelEditItem, onDeleteItem, onAddItem,
}: CategoryColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } });
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState("");
    const [unit, setUnit] = useState("");

    function submitAdd() {
        if (!name.trim()) return;
        onAddItem(name.trim(), unit.trim() || "unit");
        setName("");
        setUnit("");
        setAdding(false);
    }

    return (
        <div className="flex flex-col w-72 shrink-0 bg-gray-100 dark:bg-zinc-800 rounded-2xl p-3 gap-3 max-h-full">
            <div className="flex items-center justify-between gap-2 px-1">
                {column.renamable ? (
                    <input
                        value={column.name}
                        onChange={(e) => onRename(e.target.value)}
                        className="flex-1 min-w-0 bg-transparent font-semibold text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -mx-1"
                    />
                ) : (
                    <span className="flex-1 min-w-0 font-semibold text-sm text-gray-500 dark:text-zinc-400 truncate">{column.name}</span>
                )}
                {column.deletable && (
                    <button onClick={onDeleteColumn} aria-label="Eliminar categoría" className="shrink-0 p-1 rounded-md text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400">
                        <IoTrashOutline className="text-sm" />
                    </button>
                )}
            </div>

            <div
                ref={setNodeRef}
                className={`flex flex-col gap-2 min-h-[48px] rounded-xl p-1 flex-1 overflow-y-auto transition-colors ${isOver ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}
            >
                <SortableContext items={column.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    {column.items.map((item) => (
                        <ArticleCard
                            key={item.id}
                            item={item}
                            units={units}
                            isEditing={editingItemId === item.id}
                            edit={editingItemId === item.id ? editState : null}
                            saving={savingItem}
                            onStartEdit={() => onStartEditItem(item)}
                            onChangeEdit={onChangeEditItem}
                            onSaveEdit={onSaveEditItem}
                            onCancelEdit={onCancelEditItem}
                            onDelete={() => onDeleteItem(item)}
                        />
                    ))}
                </SortableContext>
            </div>

            {adding ? (
                <div className="flex flex-col gap-2">
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitAdd()}
                        placeholder="Nombre del artículo"
                        className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <ComboBox
                        className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={unit}
                        onChange={setUnit}
                        options={units}
                        placeholder="Unidad"
                    />
                    <div className="flex gap-2">
                        <button onClick={submitAdd} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-1.5 text-xs">Añadir</button>
                        <button onClick={() => { setAdding(false); setName(""); setUnit(""); }} className="flex-1 border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 font-semibold rounded-lg py-1.5 text-xs">Cancelar</button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setAdding(true)}
                    className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 py-1.5"
                >
                    <IoAddOutline className="text-lg" />
                    Añadir artículo
                </button>
            )}
        </div>
    );
}
