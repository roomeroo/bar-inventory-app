'use client'
import { useEffect, useRef } from "react";
import { supabase } from "../supabase";

// Subscribes to Postgres changes on the given tables, scoped to one bar,
// and calls `onChange` shortly after anything happens — so a change made
// from another tab/device (or another person managing the same bar) shows
// up here without a manual reload. Debounced because a single user action
// (e.g. reordering a whole column on the manage board) can write several
// rows in quick succession; refetching once after things settle is enough,
// and cheaper than refetching per row.
export function useRealtimeRefresh(barId: string | null, tables: string[], onChange: () => void, options?: { paused?: boolean }) {
    const onChangeRef = useRef(onChange);
    const pausedRef = useRef(options?.paused ?? false);

    // Refs are updated in effects, not during render, so a fresh
    // `onChange`/`paused` on every render never has to re-open the
    // realtime channel below.
    useEffect(() => {
        onChangeRef.current = onChange;
    });
    useEffect(() => {
        pausedRef.current = options?.paused ?? false;
    });

    const tablesKey = tables.join(",");

    useEffect(() => {
        if (!barId) return;

        let timeout: ReturnType<typeof setTimeout> | null = null;
        function scheduleRefresh() {
            if (pausedRef.current) return;
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => onChangeRef.current(), 400);
        }

        const channel = supabase.channel(`bar-${barId}-${tablesKey}`);
        for (const table of tablesKey.split(",")) {
            channel.on(
                "postgres_changes",
                { event: "*", schema: "public", table, filter: `bar_id=eq.${barId}` },
                scheduleRefresh
            );
        }
        channel.subscribe();

        return () => {
            if (timeout) clearTimeout(timeout);
            supabase.removeChannel(channel);
        };
    }, [barId, tablesKey]);
}
