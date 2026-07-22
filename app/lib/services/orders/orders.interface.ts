import type { Item } from "../items/items.interface";

export interface Order {
    id: string
    created_at: string
}

export interface OrderLine {
    item: Item
    quantity: number
}

export interface OrdersServiceI {
    getLastOrderDate(userId: string): Promise<string | null>
    confirmOrder(userId: string, lines: OrderLine[]): Promise<{ error: string | null }>
}
