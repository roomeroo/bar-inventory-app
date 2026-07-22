import { supabase } from "../../supabase";
import { getBarId } from "../bar/bar.service";
import { itemsService } from "../items/items.service";
import type { OrderLine, OrdersServiceI } from "./orders.interface";

class OrdersService implements OrdersServiceI {
    async getLastOrderDate(userId: string): Promise<string | null> {
        const barId = await getBarId(userId);
        const { data, error } = await supabase
            .from("orders")
            .select("created_at")
            .eq("bar_id", barId)
            .order("created_at", { ascending: false })
            .limit(1);
        if (error) throw error;
        return data?.[0]?.created_at ?? null;
    }

    async confirmOrder(userId: string, lines: OrderLine[]): Promise<{ error: string | null }> {
        const barId = await getBarId(userId);

        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({ bar_id: barId })
            .select()
            .single();
        if (orderError || !order) {
            return { error: orderError?.message ?? "Could not place the order." };
        }

        const orderItemRows = lines.map(({ item, quantity }) => ({
            order_id: order.id,
            article_id: item.id,
            article_name: item.name,
            unit: item.unit,
            quantity,
        }));

        const { error: orderItemsError } = await supabase.from("order_items").insert(orderItemRows);
        if (orderItemsError) {
            return { error: orderItemsError.message };
        }

        // Placing an order never changes items.quantity — it only records
        // what we now expect to have, which the next inventory count
        // compares against and then resolves.
        const updateResults = await Promise.all(
            lines.map(({ item, quantity }) =>
                itemsService.updateFields(item.id, {
                    expected_quantity: item.quantity + quantity,
                    pending_order_amount: quantity,
                })
            )
        );
        const failed = updateResults.find((r) => r.error);
        if (failed) return { error: failed.error };

        return { error: null };
    }
}

export const ordersService = new OrdersService();
