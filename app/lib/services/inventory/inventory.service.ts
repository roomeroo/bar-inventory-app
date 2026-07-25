import { supabase } from "../../supabase";
import { getBarId } from "../bar/bar.service";
import { itemsService } from "../items/items.service";
import { isLow } from "../items/low-stock";
import type {
    CountEntry,
    InventorySnapshot,
    InventorySnapshotItem,
    InventoryServiceI,
    MinStockSuggestion,
} from "./inventory.interface";

// How many of the most recent counting cycles feed the consumption trend
// used to suggest a min_stock value. Kept small so a single unusual week
// (e.g. a party) doesn't dominate, but wide enough to smooth out noise.
const TREND_CYCLES = 4;
const MIN_CYCLES_FOR_SUGGESTION = 2;

interface InventoryItemRow {
    id: number;
    session_id: number;
    article_id: string | null;
    article_name: string;
    unit: string;
    category_name: string | null;
    min_stock: number;
    last_quantity: number;
    current_quantity: number;
    order_quantity: number;
    is_low: boolean;
}

// order_quantity of 0 means "no order was pending before this count" —
// there's nothing to compare the new count against beyond min_stock, so
// expected_quantity/pending_order_amount surface as null in that case.
function mapInventoryItemRow(row: InventoryItemRow): InventorySnapshotItem {
    const hasPendingOrder = row.order_quantity > 0;
    return {
        id: String(row.id),
        snapshot_id: String(row.session_id),
        item_id: row.article_id,
        item_name: row.article_name,
        quantity: row.current_quantity,
        unit: row.unit,
        category: row.category_name,
        min_stock: row.min_stock,
        expected_quantity: hasPendingOrder ? row.last_quantity + row.order_quantity : null,
        pending_order_amount: hasPendingOrder ? row.order_quantity : null,
        is_low: row.is_low,
    };
}

class InventoryService implements InventoryServiceI {
    async getLastSnapshotDate(userId: string): Promise<string | null> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("inventory_session")
            .select("created_at")
            .eq("bar_id", barId)
            .order("created_at", { ascending: false })
            .limit(1);
        if (error) throw error;
        return data?.[0]?.created_at ?? null;
    }

    async listSnapshots(userId: string): Promise<InventorySnapshot[]> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("inventory_session")
            .select("id, created_at")
            .eq("bar_id", barId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row) => ({ id: String(row.id), created_at: row.created_at }));
    }

    async listSnapshotItems(userId: string): Promise<InventorySnapshotItem[]> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("inventory_item")
            .select("*, inventory_session!inner(bar_id)")
            .eq("inventory_session.bar_id", barId);
        if (error) throw error;
        return (data ?? []).map(mapInventoryItemRow);
    }

    // Consumption per counted cycle = what we had + what we received minus
    // what we counted this time. This never changes min_stock itself — it
    // only surfaces a suggestion the user can choose to apply by hand, so a
    // one-off spike (a party) shows up as a visible number rather than
    // silently overriding what they set.
    async getMinStockSuggestions(userId: string): Promise<Record<string, MinStockSuggestion>> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("inventory_item")
            .select("article_id, last_quantity, order_quantity, current_quantity, inventory_session!inner(bar_id, created_at)")
            .eq("inventory_session.bar_id", barId)
            .order("created_at", { referencedTable: "inventory_session", ascending: false });
        if (error) throw error;

        const cyclesByItem = new Map<string, number[]>();
        for (const row of data ?? []) {
            if (!row.article_id) continue;
            const cycles = cyclesByItem.get(row.article_id) ?? [];
            if (cycles.length >= TREND_CYCLES) continue;
            const consumption = row.last_quantity + row.order_quantity - row.current_quantity;
            cycles.push(Math.max(consumption, 0));
            cyclesByItem.set(row.article_id, cycles);
        }

        const suggestions: Record<string, MinStockSuggestion> = {};
        for (const [itemId, cycles] of cyclesByItem) {
            if (cycles.length < MIN_CYCLES_FOR_SUGGESTION) continue;
            const average = cycles.reduce((sum, c) => sum + c, 0) / cycles.length;
            suggestions[itemId] = { suggested: Math.round(average), cycles: cycles.length };
        }
        return suggestions;
    }

    async saveCount(userId: string, entries: CountEntry[]): Promise<{ error: string | null }> {
        const barId = await getBarId(userId);

        const { data: session, error: sessionError } = await supabase
            .from("inventory_session")
            .insert({ bar_id: barId })
            .select()
            .single();
        if (sessionError || !session) {
            return { error: sessionError?.message ?? "Could not start a new inventory session." };
        }

        const itemRows = entries.map(({ item, quantity }) => ({
            session_id: session.id,
            article_id: item.id,
            article_name: item.name,
            unit: item.unit,
            category_name: item.category,
            min_stock: item.min_stock,
            last_quantity: item.quantity,
            current_quantity: quantity,
            order_quantity: item.pending_order_amount ?? 0,
            is_low: isLow({ quantity, expected_quantity: item.expected_quantity, min_stock: item.min_stock }),
        }));

        const { error: itemsError } = await supabase.from("inventory_item").insert(itemRows);
        if (itemsError) {
            return { error: itemsError.message };
        }

        // Resolve the pending expectation for every counted item: the new
        // count becomes the live quantity, and expected_quantity /
        // pending_order_amount reset until another order sets them again.
        const updateResults = await Promise.all(
            entries.map(({ item, quantity }) =>
                itemsService.updateFields(item.id, {
                    quantity,
                    expected_quantity: null,
                    pending_order_amount: null,
                })
            )
        );
        const failed = updateResults.find((r) => r.error);
        if (failed) return { error: failed.error };

        return { error: null };
    }
}

export const inventoryService = new InventoryService();
