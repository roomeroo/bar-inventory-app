import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";

// Hand-rolled drag-to-reorder for a vertical list — no extra dependency.
// Pointer events unify mouse + touch. Positions are measured live via
// getBoundingClientRect() on each item, so it works regardless of item
// height. The dragged item follows the pointer via a CSS transform;
// other items reorder instantly (no FLIP animation) when crossed —
// simple, but a real drag, not up/down buttons.
export function useDragReorder<T extends { id: string }>(
    items: T[],
    setItems: (items: T[]) => void,
    onDrop: (orderedIds: string[]) => void
) {
    const itemRefs = useRef<Record<string, HTMLElement | null>>({});
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOffsetY, setDragOffsetY] = useState(0);
    const dragStartYRef = useRef(0);
    const dragStartTopRef = useRef(0);
    const lastClientYRef = useRef(0);

    function setItemRef(id: string) {
        return (el: HTMLElement | null) => { itemRefs.current[id] = el; };
    }

    function onPointerDown(e: ReactPointerEvent, id: string) {
        const el = itemRefs.current[id];
        if (!el) return;
        setDraggedId(id);
        dragStartYRef.current = e.clientY;
        lastClientYRef.current = e.clientY;
        dragStartTopRef.current = el.getBoundingClientRect().top;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: ReactPointerEvent) {
        if (!draggedId) return;
        lastClientYRef.current = e.clientY;
        const dy = e.clientY - dragStartYRef.current;
        setDragOffsetY(dy);

        const draggedEl = itemRefs.current[draggedId];
        if (!draggedEl) return;
        const height = draggedEl.getBoundingClientRect().height;
        const draggedCenter = dragStartTopRef.current + dy + height / 2;

        const draggedIdx = items.findIndex((i) => i.id === draggedId);
        let targetIdx = draggedIdx;
        items.forEach((item, i) => {
            if (i === draggedIdx) return;
            const el = itemRefs.current[item.id];
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            if (draggedCenter > center && i > targetIdx) targetIdx = i;
            if (draggedCenter < center && i < targetIdx) targetIdx = i;
        });

        if (targetIdx !== draggedIdx) {
            const reordered = [...items];
            const [moved] = reordered.splice(draggedIdx, 1);
            reordered.splice(targetIdx, 0, moved);
            setItems(reordered);
            // Don't recalibrate here — the DOM still reflects the
            // pre-reorder layout (React hasn't committed yet), so reading
            // getBoundingClientRect() now would capture a stale position
            // and the drag baseline would drift out of sync with the
            // pointer on every swap. The layout effect below does the
            // recalibration once the reordered DOM has actually landed.
        }
    }

    // Runs after the DOM commits the reordered list, once the dragged
    // element's rect reflects where it actually landed.
    useLayoutEffect(() => {
        if (!draggedId) return;
        const el = itemRefs.current[draggedId];
        if (!el) return;
        dragStartTopRef.current = el.getBoundingClientRect().top;
        dragStartYRef.current = lastClientYRef.current;
        setDragOffsetY(0);
    }, [items, draggedId]);

    function onPointerUp() {
        if (!draggedId) return;
        setDraggedId(null);
        setDragOffsetY(0);
        onDrop(items.map((i) => i.id));
    }

    function dragStyle(id: string): CSSProperties {
        if (id !== draggedId) return {};
        return {
            transform: `translateY(${dragOffsetY}px)`,
            zIndex: 10,
            position: "relative",
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
        };
    }

    return { setItemRef, onPointerDown, onPointerMove, onPointerUp, dragStyle, draggedId };
}
