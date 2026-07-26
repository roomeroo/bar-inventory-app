'use client'
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { IoSearch, IoGridOutline, IoChevronDown, IoChevronForward } from "react-icons/io5";
import { useAuth } from "./lib/services/auth/auth-context";
import { itemsService } from "./lib/services/items/items.service";
import { categoriesService } from "./lib/services/categories/categories.service";
import QuantityStepper from "./components/QuantityStepper";
import type { Item } from "./lib/services/items/items.interface";
import type { Category } from "./lib/services/categories/categories.interface";

const UNCATEGORIZED = "__uncategorized__";

export default function Home() {
    const { user } = useAuth();
    const [items, setItems] = useState<Item[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    function toggleGroup(key: string) {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    useEffect(() => {
        if (!user) return;
        let ignore = false;

        async function load() {
            setLoading(true);
            setError(false);
            try {
                const [itemsData, categoriesData] = await Promise.all([
                    itemsService.list(user!.id),
                    categoriesService.list(user!.id),
                ]);
                if (ignore) return;
                setItems(itemsData);
                setCategories(categoriesData);
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

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            if (categoryFilter !== "all") {
                const itemCategoryKey = item.category_id ?? UNCATEGORIZED;
                if (itemCategoryKey !== categoryFilter) return false;
            }
            if (!q) return true;
            return item.name.toLowerCase().includes(q) || (item.category ?? "").toLowerCase().includes(q);
        });
    }, [items, search, categoryFilter]);

    const groups = useMemo(() => {
        const byCategory = new Map<string, Item[]>();
        for (const item of filtered) {
            const key = item.category_id ?? UNCATEGORIZED;
            const list = byCategory.get(key) ?? [];
            list.push(item);
            byCategory.set(key, list);
        }
        const ordered: { key: string; name: string; items: Item[] }[] = [];
        for (const category of categories) {
            const list = byCategory.get(category.id);
            if (list?.length) ordered.push({ key: category.id, name: category.name, items: list });
        }
        const uncategorized = byCategory.get(UNCATEGORIZED);
        if (uncategorized?.length) ordered.push({ key: UNCATEGORIZED, name: "Sin categoría", items: uncategorized });
        return ordered;
    }, [filtered, categories]);

    function setNeeded(itemId: string, quantity: number) {
        setItems((current) => current.map((i) => (i.id === itemId ? { ...i, needed_quantity: quantity } : i)));
        itemsService.setNeeded(itemId, quantity).then(({ error }) => {
            if (error) {
                toast.error(error);
                setReloadKey((k) => k + 1);
            }
        });
    }

    return (
        <main className="flex flex-col gap-5 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Artículos</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-zinc-50">@{user?.username}</p>
                </div>
                <Link
                    href="/manage"
                    className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-semibold"
                >
                    <IoGridOutline className="text-lg" />
                    Gestionar
                </Link>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-red-700 dark:text-red-300">No se pudieron cargar los artículos.</p>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Reintentar
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o categoría..."
                        className="w-full rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Todas las categorías</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value={UNCATEGORIZED}>Sin categoría</option>
                </select>
            </div>

            {loading ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">Cargando...</p>
            ) : groups.length === 0 ? (
                <p className="text-base text-gray-500 dark:text-zinc-400">
                    {items.length === 0
                        ? <>No hay artículos todavía. Añádelos desde <Link href="/manage" className="text-blue-600 dark:text-blue-400 font-semibold">Gestionar</Link>.</>
                        : "Ningún artículo coincide con la búsqueda."}
                </p>
            ) : (
                <div className="flex flex-col gap-6">
                    {groups.map((group) => {
                        const isCollapsed = collapsedGroups.has(group.key);
                        return (
                            <div key={group.key} className="flex flex-col gap-2">
                                <button
                                    onClick={() => toggleGroup(group.key)}
                                    className="flex items-center gap-1.5 text-left"
                                >
                                    {isCollapsed ? (
                                        <IoChevronForward className="text-sm text-gray-400 dark:text-zinc-500" />
                                    ) : (
                                        <IoChevronDown className="text-sm text-gray-400 dark:text-zinc-500" />
                                    )}
                                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                        {group.name}
                                    </span>
                                    <span className="text-xs font-normal normal-case text-gray-400 dark:text-zinc-500">
                                        ({group.items.length})
                                    </span>
                                </button>
                                {!isCollapsed && (
                                    <div className="flex flex-col gap-2">
                                        {group.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-4"
                                            >
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-base text-gray-900 dark:text-zinc-50 truncate">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-sm text-gray-500 dark:text-zinc-400">{item.unit}</span>
                                                </div>
                                                <QuantityStepper
                                                    value={item.needed_quantity}
                                                    unit={item.unit}
                                                    onChange={(q) => setNeeded(item.id, q)}
                                                />
                                            </div>
                                        ))}
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
