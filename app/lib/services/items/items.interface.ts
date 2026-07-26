// App-facing shape of an "article" row (+ its resolved category name).
// Keeping this stable even though the underlying table/columns are
// bar/category-scoped means pages never need to know about that.
export interface Item {
    id: string
    name: string
    unit: string
    category_id: string | null
    category: string | null
    needed_quantity: number
    sort_order: number
    created_at: string
    updated_at: string
}

export interface NewItemInput {
    name: string
    unit: string
    category_id?: string | null
}

export interface ItemsServiceI {
    list(userId: string): Promise<Item[]>
    listUnits(userId: string): Promise<string[]>
    reorder(orderedIds: string[]): Promise<{ error: string | null }>
    moveToCategory(itemId: string, categoryId: string | null, orderedIds: string[]): Promise<{ error: string | null }>
    create(userId: string, input: NewItemInput): Promise<{ item: Item | null; error: string | null }>
    update(userId: string, itemId: string, input: Partial<NewItemInput>): Promise<{ error: string | null }>
    remove(itemId: string): Promise<{ error: string | null }>
    setNeeded(itemId: string, quantity: number): Promise<{ error: string | null }>
    clearNeeded(itemId: string): Promise<{ error: string | null }>
}
