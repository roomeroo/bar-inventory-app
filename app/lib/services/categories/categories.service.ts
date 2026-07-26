import { supabase } from "../../supabase";
import { getBarId } from "../bar/bar.service";
import { toFriendlyMessage } from "../friendly-error";
import type { Category, CategoriesServiceI } from "./categories.interface";

class CategoriesService implements CategoriesServiceI {
    async list(userId: string): Promise<Category[]> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("category")
            .select("id, name, sort_order")
            .eq("bar_id", barId)
            .order("sort_order", { ascending: true });
        if (error) throw error;
        return data ?? [];
    }

    async create(userId: string, name: string): Promise<{ category: Category | null; error: string | null }> {
        const barId = await getBarId(userId);

        const { data: lastRow } = await supabase
            .from("category")
            .select("sort_order")
            .eq("bar_id", barId)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();
        const nextOrder = (lastRow?.sort_order ?? -1) + 1;

        const { data, error } = await supabase
            .from("category")
            .insert({ bar_id: barId, name, sort_order: nextOrder })
            .select("id, name, sort_order")
            .single();
        if (error) return { category: null, error: toFriendlyMessage(error, error.message) };
        return { category: data, error: null };
    }

    async rename(categoryId: string, name: string): Promise<{ error: string | null }> {
        const { error } = await supabase.from("category").update({ name }).eq("id", categoryId);
        return { error: error ? toFriendlyMessage(error, error.message) : null };
    }

    async remove(categoryId: string): Promise<{ error: string | null }> {
        // article.category_id references category with `on delete set null`,
        // so removing a category just drops its articles back to "uncategorized".
        const { error } = await supabase.from("category").delete().eq("id", categoryId);
        return { error: error ? toFriendlyMessage(error, error.message) : null };
    }

    async reorder(orderedIds: string[]): Promise<{ error: string | null }> {
        const results = await Promise.all(
            orderedIds.map((id, index) => supabase.from("category").update({ sort_order: index }).eq("id", id))
        );
        const failed = results.find((r) => r.error);
        return { error: failed?.error ? toFriendlyMessage(failed.error, failed.error.message) : null };
    }
}

export const categoriesService = new CategoriesService();
