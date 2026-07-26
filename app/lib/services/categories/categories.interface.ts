export interface Category {
    id: string
    name: string
    sort_order: number
}

export interface CategoriesServiceI {
    list(userId: string): Promise<Category[]>
    create(userId: string, name: string): Promise<{ category: Category | null; error: string | null }>
    rename(categoryId: string, name: string): Promise<{ error: string | null }>
    remove(categoryId: string): Promise<{ error: string | null }>
    reorder(orderedIds: string[]): Promise<{ error: string | null }>
}
