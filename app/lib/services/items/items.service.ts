import { supabase } from "../../supabase";
import { getBarId } from "../bar/bar.service";
import { toFriendlyMessage } from "../friendly-error";
import type { Item, NewItemInput, ItemsServiceI } from "./items.interface";

interface ArticleRow {
    id: string;
    name: string;
    unit: string;
    min_stock: number;
    quantity: number;
    expected_quantity: number | null;
    pending_order_amount: number | null;
    created_at: string;
    updated_at: string;
    category: { name: string } | null;
}

function mapArticleRow(row: ArticleRow): Item {
    return {
        id: row.id,
        name: row.name,
        unit: row.unit,
        category: row.category?.name ?? null,
        min_stock: row.min_stock,
        quantity: row.quantity,
        expected_quantity: row.expected_quantity,
        pending_order_amount: row.pending_order_amount,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

// Categories are their own table scoped to a bar. Pages only ever deal
// with a plain category name string, so this resolves (or creates) the
// matching category row behind the scenes.
async function resolveCategoryId(barId: string, categoryName: string | null | undefined): Promise<string | null> {
    const trimmed = categoryName?.trim();
    if (!trimmed) return null;

    const { data: existing, error: selectError } = await supabase
        .from("category")
        .select("id")
        .eq("bar_id", barId)
        .eq("name", trimmed)
        .maybeSingle();
    if (selectError) throw selectError;
    if (existing) return existing.id;

    const { data: created, error: insertError } = await supabase
        .from("category")
        .insert({ bar_id: barId, name: trimmed })
        .select("id")
        .single();
    if (insertError) throw insertError;
    return created.id;
}

class ItemsService implements ItemsServiceI {
    async list(userId: string): Promise<Item[]> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("article")
            .select("*, category:category_id(name)")
            .eq("bar_id", barId)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });
        if (error) throw error;
        return (data ?? []).map(mapArticleRow);
    }

    async listUnits(userId: string): Promise<string[]> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("article")
            .select("unit")
            .eq("bar_id", barId);
        if (error) throw error;
        const unique = Array.from(new Set((data ?? []).map((row) => row.unit)));
        return unique.sort((a, b) => a.localeCompare(b));
    }

    async listCategories(userId: string): Promise<string[]> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("category")
            .select("name")
            .eq("bar_id", barId)
            .order("name", { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row) => row.name);
    }

    async reorder(orderedIds: string[]): Promise<{ error: string | null }> {
        const results = await Promise.all(
            orderedIds.map((id, index) => supabase.from("article").update({ sort_order: index }).eq("id", id))
        );
        const failed = results.find((r) => r.error);
        return { error: failed?.error ? toFriendlyMessage(failed.error, failed.error.message) : null };
    }

    async create(userId: string, input: NewItemInput): Promise<{ item: Item | null; error: string | null }> {
        const barId = await getBarId(userId);

        let categoryId: string | null;
        try {
            categoryId = await resolveCategoryId(barId, input.category);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Could not resolve category.";
            return { item: null, error: toFriendlyMessage({ message }, "Could not resolve category.") };
        }

        // New items append to the end of the bar's custom order rather
        // than defaulting to 0, which would otherwise jump them to the front.
        const { data: lastRow } = await supabase
            .from("article")
            .select("sort_order")
            .eq("bar_id", barId)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();
        const nextOrder = (lastRow?.sort_order ?? -1) + 1;

        // Single source of truth for "what a blank field becomes" — pages
        // leave these empty (with a placeholder showing this same default)
        // rather than pre-filling the input with a real value the user has
        // to delete first.
        const unit = input.unit.trim() || "unit";
        const quantity = Number.isFinite(input.quantity) ? input.quantity : 0;
        const minStock = Number.isFinite(input.min_stock) ? input.min_stock : 0;

        const { data, error } = await supabase
            .from("article")
            .insert({
                bar_id: barId,
                category_id: categoryId,
                name: input.name,
                unit,
                min_stock: minStock,
                quantity,
                sort_order: nextOrder,
            })
            .select("*, category:category_id(name)")
            .single();
        if (error) return { item: null, error: toFriendlyMessage(error, error.message) };
        return { item: mapArticleRow(data), error: null };
    }

    async update(userId: string, itemId: string, input: Partial<NewItemInput>): Promise<{ error: string | null }> {
        const updates: Record<string, unknown> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.unit !== undefined) updates.unit = input.unit;
        if (input.min_stock !== undefined) updates.min_stock = input.min_stock;
        if (input.quantity !== undefined) updates.quantity = input.quantity;

        if (input.category !== undefined) {
            const barId = await getBarId(userId);
            try {
                updates.category_id = await resolveCategoryId(barId, input.category);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Could not resolve category.";
                return { error: toFriendlyMessage({ message }, "Could not resolve category.") };
            }
        }

        const { error } = await supabase.from("article").update(updates).eq("id", itemId);
        return { error: error ? toFriendlyMessage(error, error.message) : null };
    }

    async remove(itemId: string): Promise<{ error: string | null }> {
        const { error } = await supabase.from("article").delete().eq("id", itemId);
        return { error: error ? toFriendlyMessage(error, error.message) : null };
    }

    async updateFields(
        itemId: string,
        fields: Partial<Pick<Item, "quantity" | "expected_quantity" | "pending_order_amount">>
    ): Promise<{ error: string | null }> {
        const { error } = await supabase.from("article").update(fields).eq("id", itemId);
        return { error: error?.message ?? null };
    }
}

export const itemsService = new ItemsService();
