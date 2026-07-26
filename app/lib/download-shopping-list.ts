export interface ShoppingListLine {
    name: string
    quantity: number
    unit: string
}

export function buildShoppingListText(date: Date, lines: ShoppingListLine[]): string {
    return [
        `Shopping list — ${date.toLocaleDateString()}`,
        "",
        ...lines.map((l) => `- ${l.name}: ${l.quantity} ${l.unit}`),
    ].join("\n");
}

// Client-side only (Blob + a temporary <a download>) — no server involved,
// consistent with this app being a pure static export.
export function downloadShoppingList(date: Date, lines: ShoppingListLine[]) {
    const body = buildShoppingListText(date, lines);
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-${date.toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function copyShoppingListToClipboard(date: Date, lines: ShoppingListLine[]): Promise<void> {
    await navigator.clipboard.writeText(buildShoppingListText(date, lines));
}
