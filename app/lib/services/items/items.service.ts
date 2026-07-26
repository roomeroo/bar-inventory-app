import { supabase } from "../../supabase";
import { getBarId } from "../bar/bar.service";
import { toFriendlyMessage } from "../friendly-error";
import type { Item, NewItemInput, ItemsServiceI } from "./items.interface";

interface ArticleRow {
    id: string;
    name: string;
    unit: string;
    category_id: string | null;
    needed_quantity: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
    category: { name: string } | null;
}

function mapArticleRow(row: ArticleRow): Item {
    return {
        id: row.id,
        name: row.name,
        unit: row.unit,
        category_id: row.category_id,
        category: row.category?.name ?? null,
        needed_quantity: row.needed_quantity,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
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

    async reorder(orderedIds: string[]): Promise<{ error: string | null }> {
        const results = await Promise.all(
            orderedIds.map((id, index) => supabase.from("article").update({ sort_order: index }).eq("id", id))
        );
        const failed = results.find((r) => r.error);
        return { error: failed?.error ? toFriendlyMessage(failed.error, failed.error.message) : null };
    }

    // Used when a card is dropped into a (possibly different) column on
    // the manage board: orderedIds is the destination column's full order
    // after the drop, so every card in it gets a fresh sort_order, and the
    // moved item additionally gets the new category_id.
    async moveToCategory(itemId: string, categoryId: string | null, orderedIds: string[]): Promise<{ error: string | null }> {
        const results = await Promise.all(
            orderedIds.map((id, index) => {
                const fields: Record<string, unknown> = { sort_order: index };
                if (id === itemId) fields.category_id = categoryId;
                return supabase.from("article").update(fields).eq("id", id);
            })
        );
        const failed = results.find((r) => r.error);
        return { error: failed?.error ? toFriendlyMessage(failed.error, failed.error.message) : null };
    }

    async create(userId: string, input: NewItemInput): Promise<{ item: Item | null; error: string | null }> {
        const barId = await getBarId(userId);

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

        const unit = input.unit.trim() || "unit";

        const { data, error } = await supabase
            .from("article")
            .insert({
                bar_id: barId,
                category_id: input.category_id ?? null,
                name: input.name,
                unit,
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
        if (input.category_id !== undefined) updates.category_id = input.category_id;

        const { error } = await supabase.from("article").update(updates).eq("id", itemId);
        return { error: error ? toFriendlyMessage(error, error.message) : null };
    }

    async remove(itemId: string): Promise<{ error: string | null }> {
        const { error } = await supabase.from("article").delete().eq("id", itemId);
        return { error: error ? toFriendlyMessage(error, error.message) : null };
    }

    async setNeeded(itemId: string, quantity: number): Promise<{ error: string | null }> {
        const { error } = await supabase.from("article").update({ needed_quantity: quantity }).eq("id", itemId);
        return { error: error ? toFriendlyMessage(error, error.message) : null };
    }

    async clearNeeded(itemId: string): Promise<{ error: string | null }> {
        return this.setNeeded(itemId, 0);
    }
}

export const itemsService = new ItemsService();
