import type { Item } from "../items/items.interface";

export interface InventorySnapshot {
    id: string
    created_at: string
}

export interface InventorySnapshotItem {
    id: string
    snapshot_id: string
    item_id: string | null
    item_name: string
    quantity: number
    unit: string
    category: string | null
    min_stock: number
    expected_quantity: number | null
    pending_order_amount: number | null
    is_low: boolean
}

export interface CountEntry {
    item: Item
    quantity: number
}

export interface InventoryServiceI {
    getLastSnapshotDate(userId: string): Promise<string | null>
    listSnapshots(userId: string): Promise<InventorySnapshot[]>
    listSnapshotItems(userId: string): Promise<InventorySnapshotItem[]>
    saveCount(userId: string, entries: CountEntry[]): Promise<{ error: string | null }>
}
