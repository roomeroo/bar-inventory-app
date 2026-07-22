'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { IoArrowBack } from "react-icons/io5";
import { useAuth } from "../../lib/services/auth/auth-context";
import { itemsService } from "../../lib/services/items/items.service";

export default function AddItemPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [unit, setUnit] = useState("unit");
    const [quantity, setQuantity] = useState("0");
    const [minStock, setMinStock] = useState("0");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        if (!name.trim()) {
            toast.error("Name is required.");
            return;
        }

        setSubmitting(true);
        const { error } = await itemsService.create(user.id, {
            name: name.trim(),
            unit: unit.trim() || "unit",
            category: category.trim() || null,
            quantity: Number(quantity) || 0,
            min_stock: Number(minStock) || 0,
        });
        setSubmitting(false);

        if (error) {
            toast.error(error);
            return;
        }
        toast.success("Item added");
        router.push("/");
    }

    return (
        <main className="flex flex-col gap-6 p-5">
            <div className="flex items-center gap-3 pt-3">
                <Link href="/" className="text-gray-400 dark:text-zinc-500">
                    <IoArrowBack className="text-xl" />
                </Link>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">Add item</h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm text-gray-500 dark:text-zinc-400">
                    Name
                    <input
                        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-gray-800 dark:text-zinc-100"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Blue Gin"
                        required
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-500 dark:text-zinc-400">
                    Category
                    <input
                        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-gray-800 dark:text-zinc-100"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Spirits"
                    />
                </label>

                <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1 text-sm text-gray-500 dark:text-zinc-400">
                        Unit
                        <input
                            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-gray-800 dark:text-zinc-100"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="bottle"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-gray-500 dark:text-zinc-400">
                        Current quantity
                        <input
                            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-gray-800 dark:text-zinc-100"
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </label>
                </div>

                <label className="flex flex-col gap-1 text-sm text-gray-500 dark:text-zinc-400">
                    Minimum stock (flag as low at or below this)
                    <input
                        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-gray-800 dark:text-zinc-100"
                        type="number"
                        min="0"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                    />
                </label>

                <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3"
                >
                    {submitting ? "Saving..." : "Save item"}
                </button>
            </form>
        </main>
    );
}
