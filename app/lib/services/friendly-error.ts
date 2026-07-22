// Postgres/Supabase errors normally leak raw constraint names straight
// to the UI (e.g. `duplicate key value violates unique constraint
// "article_bar_id_name_key"`). This maps the ones we know about to
// plain text, falling back to a generic message for anything else.
const CONSTRAINT_MESSAGES: [needle: string, message: string][] = [
    ["article_bar_id_name_key", "An item with this name already exists."],
    ["category_bar_id_name_key", "That category name is already in use."],
    ["profiles_username_key", "That username is already taken."],
];

export function toFriendlyMessage(error: { message?: string } | null | undefined, fallback: string): string {
    const msg = error?.message ?? "";
    for (const [needle, friendly] of CONSTRAINT_MESSAGES) {
        if (msg.includes(needle)) return friendly;
    }
    if (msg.includes("duplicate key value")) return "That value is already in use.";
    return fallback;
}
