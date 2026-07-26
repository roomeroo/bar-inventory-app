import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";

interface DragSession {
    orderIds: string[];
    draggedIdx: number;
    targetIdx: number;
    startClientY: number;
    originalTop: Record<string, number>;
    itemHeight: number;
}

// Hand-rolled drag-to-reorder for a vertical list — no extra dependency.
// Pointer events unify mouse + touch.
//
// Earlier version re-measured getBoundingClientRect() and called
// setItems() on every swap mid-drag. That raced React's render: a fast,
// continuous drag fires many pointermove events before React has a chance
// to reflow the DOM in between, so most of those events computed against
// a stale layout and the whole thing drifted out of sync with the pointer
// (worst on long drags, e.g. first item to last).
//
// This version never touches React state mid-drag. The whole gesture
// works off one frozen snapshot taken at pointerdown (original item
// order + each item's on-screen position) plus pure arithmetic — no
// re-measuring, so there's nothing for a render to race. Other items are
// nudged out of the way by writing `transform` on their DOM nodes
// directly (bypassing React), and the real reorder is only committed to
// React state once, on drop.
export function useDragReorder<T extends { id: string }>(
    items: T[],
    setItems: (items: T[]) => void,
    onDrop: (orderedIds: string[]) => void
) {
    const itemRefs = useRef<Record<string, HTMLElement | null>>({});
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOffsetY, setDragOffsetY] = useState(0);
    const session = useRef<DragSession | null>(null);

    function setItemRef(id: string) {
        return (el: HTMLElement | null) => { itemRefs.current[id] = el; };
    }

    function setDisplacement(id: string, shiftPx: number, animate: boolean) {
        const el = itemRefs.current[id];
        if (!el) return;
        el.style.transition = animate ? "transform 150ms ease" : "";
        el.style.transform = shiftPx ? `translateY(${shiftPx}px)` : "";
    }

    function onPointerDown(e: ReactPointerEvent, id: string) {
        const el = itemRefs.current[id];
        if (!el) return;

        const orderIds = items.map((i) => i.id);
        const originalTop: Record<string, number> = {};
        for (const itemId of orderIds) {
            const itemEl = itemRefs.current[itemId];
            if (itemEl) originalTop[itemId] = itemEl.getBoundingClientRect().top;
        }

        session.current = {
            orderIds,
            draggedIdx: orderIds.indexOf(id),
            targetIdx: orderIds.indexOf(id),
            startClientY: e.clientY,
            originalTop,
            itemHeight: el.getBoundingClientRect().height,
        };
        setDraggedId(id);
        setDragOffsetY(0);
        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
            // Some engines reject capture for a pointer id that isn't
            // "active" yet — harmless, the drag still works via the plain
            // pointermove/pointerup listeners either way.
        }
    }

    function onPointerMove(e: ReactPointerEvent) {
        const s = session.current;
        if (!s) return;

        const dy = e.clientY - s.startClientY;
        setDragOffsetY(dy);

        const draggedItemId = s.orderIds[s.draggedIdx];
        const draggedCenter = s.originalTop[draggedItemId] + dy + s.itemHeight / 2;

        let targetIdx = s.draggedIdx;
        s.orderIds.forEach((id, i) => {
            if (i === s.draggedIdx) return;
            const top = s.originalTop[id];
            if (top == null) return;
            const center = top + s.itemHeight / 2;
            if (draggedCenter > center && i > targetIdx) targetIdx = i;
            if (draggedCenter < center && i < targetIdx) targetIdx = i;
        });
        s.targetIdx = targetIdx;

        // Displace every item that sits between the dragged item's
        // original slot and where it would land now — each shifts by
        // exactly one item's height to make room, purely via direct DOM
        // writes (no React state involved).
        s.orderIds.forEach((id, i) => {
            if (id === draggedItemId) return;
            let shift = 0;
            if (targetIdx > s.draggedIdx && i > s.draggedIdx && i <= targetIdx) shift = -s.itemHeight;
            else if (targetIdx < s.draggedIdx && i >= targetIdx && i < s.draggedIdx) shift = s.itemHeight;
            setDisplacement(id, shift, true);
        });
    }

    function endDrag() {
        const s = session.current;
        if (!s) return;
        for (const id of s.orderIds) setDisplacement(id, 0, false);
        session.current = null;
        setDraggedId(null);
        setDragOffsetY(0);
        return s;
    }

    function onPointerUp() {
        const s = endDrag();
        if (!s) return;
        if (s.targetIdx === s.draggedIdx) return;
        const reordered = [...s.orderIds];
        const [moved] = reordered.splice(s.draggedIdx, 1);
        reordered.splice(s.targetIdx, 0, moved);
        // Commit to React state exactly once, here — not on every swap
        // mid-drag — so there's a single render at the end instead of one
        // per crossing.
        setItems(reordered.map((id) => items.find((i) => i.id === id)!));
        onDrop(reordered);
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
