'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { IoArrowBack } from "react-icons/io5";
import { useAuth } from "../../lib/services/auth/auth-context";
import { itemsService } from "../../lib/services/items/items.service";
import ComboBox from "../../components/ComboBox";

const inputClass = "rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-base text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300";

export default function AddItemPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [unit, setUnit] = useState("unit");
    const [quantity, setQuantity] = useState("0");
    const [minStock, setMinStock] = useState("0");
    const [submitting, setSubmitting] = useState(false);
    const [units, setUnits] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (!user) return;
        itemsService.listUnits(user.id).then(setUnits).catch(() => {});
        itemsService.listCategories(user.id).then(setCategories).catch(() => {});
    }, [user]);

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
        <main className="flex flex-col gap-6 p-6 sm:p-8 max-w-lg mx-auto">
            <div className="flex items-center gap-3 pt-2">
                <Link href="/" className="text-gray-500 dark:text-zinc-400">
                    <IoArrowBack className="text-xl" />
                </Link>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Add item</h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <label className={labelClass}>
                    Name
                    <input
                        className={inputClass}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Blue Gin"
                        required
                    />
                </label>

                <label className={labelClass}>
                    Category
                    <ComboBox
                        className={inputClass}
                        value={category}
                        onChange={setCategory}
                        options={categories}
                        placeholder="Spirits"
                    />
                </label>

                <div className="grid grid-cols-2 gap-4">
                    <label className={labelClass}>
                        Unit
                        <ComboBox
                            className={inputClass}
                            value={unit}
                            onChange={setUnit}
                            options={units}
                            placeholder="bottle"
                        />
                    </label>
                    <label className={labelClass}>
                        Current quantity
                        <input
                            className={inputClass}
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </label>
                </div>

                <label className={labelClass}>
                    Minimum stock (flag as low at or below this)
                    <input
                        className={inputClass}
                        type="number"
                        min="0"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                    />
                </label>

                <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base mt-2"
                >
                    {submitting ? "Saving..." : "Save item"}
                </button>
            </form>
        </main>
    );
}
