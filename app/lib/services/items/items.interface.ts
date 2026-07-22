// App-facing shape of an "article" row (+ its resolved category name).
// Keeping this stable even though the underlying table/columns are
// bar/category-scoped means pages never need to know about that.
export interface Item {
    id: string
    name: string
    unit: string
    category: string | null
    min_stock: number
    quantity: number
    expected_quantity: number | null
    pending_order_amount: number | null
    created_at: string
    updated_at: string
}

export interface NewItemInput {
    name: string
    unit: string
    category?: string | null
    min_stock: number
    quantity: number
}

export interface ItemsServiceI {
    list(userId: string): Promise<Item[]>
    listUnits(userId: string): Promise<string[]>
    create(userId: string, input: NewItemInput): Promise<{ item: Item | null; error: string | null }>
    update(userId: string, itemId: string, input: Partial<NewItemInput>): Promise<{ error: string | null }>
    remove(itemId: string): Promise<{ error: string | null }>
    updateFields(
        itemId: string,
        fields: Partial<Pick<Item, "quantity" | "expected_quantity" | "pending_order_amount">>
    ): Promise<{ error: string | null }>
}
