import type { Item } from "./items.interface";

// Effective low-stock rule, shared by home stats, /order, the inventory
// count screen, and history badges: if a prior order is still pending
// (expected_quantity is set), compare against what we expected to have;
// otherwise fall back to the item's fixed min_stock floor.
export function isLow(item: Pick<Item, "quantity" | "expected_quantity" | "min_stock">): boolean {
    if (item.expected_quantity != null) {
        return item.quantity < item.expected_quantity;
    }
    return item.quantity <= item.min_stock;
}
