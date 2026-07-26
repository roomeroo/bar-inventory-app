'use client'
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IoReorderThree, IoPencilOutline, IoTrashOutline } from "react-icons/io5";
import ComboBox from "../components/ComboBox";
import type { Item } from "../lib/services/items/items.interface";

export interface EditState {
    name: string
    unit: string
}

interface ArticleCardProps {
    item: Item
    units: string[]
    isEditing: boolean
    edit: EditState | null
    saving: boolean
    onStartEdit: () => void
    onChangeEdit: (edit: EditState) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onDelete: () => void
}

export default function ArticleCard({
    item, units, isEditing, edit, saving, onStartEdit, onChangeEdit, onSaveEdit, onCancelEdit, onDelete,
}: ArticleCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
        data: { type: "item" },
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
    const inputClass = "rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";

    if (isEditing && edit) {
        return (
            <div ref={setNodeRef} style={style} className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 flex flex-col gap-2">
                <input
                    className={inputClass}
                    value={edit.name}
                    onChange={(e) => onChangeEdit({ ...edit, name: e.target.value })}
                    placeholder="Name"
                    autoFocus
                />
                <ComboBox className={inputClass} value={edit.unit} onChange={(unit) => onChangeEdit({ ...edit, unit })} options={units} placeholder="Unit" />
                <div className="flex gap-2">
                    <button onClick={onSaveEdit} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg py-1.5 text-xs">
                        {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={onCancelEdit} className="flex-1 border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 font-semibold rounded-lg py-1.5 text-xs">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5 flex items-center gap-2">
            <button
                {...attributes}
                {...listeners}
                aria-label="Drag item"
                style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
                className="shrink-0 text-gray-400 dark:text-zinc-500 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
                <IoReorderThree className="text-lg" />
            </button>
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-zinc-50 truncate">{item.name}</span>
                <span className="text-xs text-gray-500 dark:text-zinc-400">{item.unit}</span>
            </div>
            <button onClick={onStartEdit} aria-label="Edit" className="shrink-0 p-1.5 rounded-md text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-blue-600 dark:hover:text-blue-400">
                <IoPencilOutline className="text-base" />
            </button>
            <button onClick={onDelete} aria-label="Delete" className="shrink-0 p-1.5 rounded-md text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400">
                <IoTrashOutline className="text-base" />
            </button>
        </div>
    );
}
