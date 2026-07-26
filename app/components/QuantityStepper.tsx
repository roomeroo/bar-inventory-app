'use client'
import { IoAddCircle, IoRemoveCircleOutline, IoAddCircleOutline } from "react-icons/io5";

export interface QuantityStepperProps {
    value: number
    onChange: (value: number) => void
    unit?: string
}

// Ghost "+" when nothing is marked yet; once a quantity is set it shows
// as a badge flanked by − / + controls. Used both on the articles list
// (mark how many units are needed) and the order screen (adjust before
// confirming).
export default function QuantityStepper({ value, onChange, unit }: QuantityStepperProps) {
    if (value <= 0) {
        return (
            <button
                onClick={() => onChange(1)}
                aria-label="Marcar cantidad"
                className="shrink-0 text-2xl text-gray-300 dark:text-zinc-600 hover:text-blue-600 dark:hover:text-blue-400"
            >
                <IoAddCircleOutline />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 shrink-0">
            <button
                onClick={() => onChange(Math.max(0, value - 1))}
                aria-label="Restar uno"
                className="text-xl text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
            >
                <IoRemoveCircleOutline />
            </button>
            <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
                className="w-14 text-center font-semibold text-sm rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={unit ? `Cantidad en ${unit}` : "Cantidad"}
            />
            <button
                onClick={() => onChange(value + 1)}
                aria-label="Sumar uno"
                className="text-xl text-gray-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400"
            >
                <IoAddCircle />
            </button>
        </div>
    );
}
