import type { Item } from "./items.interface";

// Effective low-stock rule, shared by home stats, /order, the inventory
// count screen, and history badges: if a prior order is still pending
// (expected_quantity is set), compare against what we expected to have;
// otherwise fall back to the item's fixed min_stock floor. Both comparisons
// are strict (<) so that landing exactly on the target — e.g. an order for
// "10 to reach 10" that gets fully received — counts as resolved instead of
// immediately flagging low again next cycle. A min_stock of 0 is a
// deliberate "don't track this as low stock" opt-out (e.g. a discontinued
// or off-menu item) — it should never trigger a reorder suggestion on its
// own, even at quantity 0.
export function isLow(item: Pick<Item, "quantity" | "expected_quantity" | "min_stock">): boolean {
    if (item.expected_quantity != null) {
        return item.quantity < item.expected_quantity;
    }
    if (item.min_stock <= 0) return false;
    return item.quantity < item.min_stock;
}
