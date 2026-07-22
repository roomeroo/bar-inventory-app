import { supabase } from "../../supabase";

// Every account gets exactly one bar row, auto-created by the
// handle_new_user trigger at signup. All other services resolve this
// id first, then scope their queries to it.
export async function getBarId(userId: string): Promise<string> {
    const { data, error } = await supabase
        .from("bar")
        .select("id")
        .eq("user_id", userId)
        .single();
    if (error || !data) throw new Error(error?.message ?? "No bar found for this account.");
    return data.id;
}
