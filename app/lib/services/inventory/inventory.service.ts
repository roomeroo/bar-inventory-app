import { supabase } from "../../supabase";
import { getBarId } from "../bar/bar.service";
import { itemsService } from "../items/items.service";
import { isLow } from "../items/low-stock";
import type {
    CountEntry,
    InventorySnapshot,
    InventorySnapshotItem,
    InventoryServiceI,
} from "./inventory.interface";

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
