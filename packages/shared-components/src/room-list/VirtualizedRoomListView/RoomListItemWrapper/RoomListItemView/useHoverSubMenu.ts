/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** How long the pointer may be outside both the trigger and the submenu before the submenu closes. */
const CLOSE_DELAY_MS = 150;

/** Props to spread onto both the submenu trigger and a wrapper around the submenu content. */
export interface HoverSubMenuHandlers {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
}

/**
 * State for a submenu that closes when the pointer leaves it.
 *
 * By default a submenu stays open until the pointer moves onto another menu item, so moving to an empty part of
 * the menu leaves it open. The short delay lets the pointer cross the gap between the trigger and the submenu.
 */
export function useHoverSubMenu(): {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    handlers: HoverSubMenuHandlers;
} {
    const [open, setOpen] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const cancelClose = useCallback((): void => clearTimeout(timer.current), []);
    useEffect(() => cancelClose, [cancelClose]);

    const onOpenChange = useCallback(
        (value: boolean): void => {
            cancelClose();
            setOpen(value);
        },
        [cancelClose],
    );

    const onPointerLeave = useCallback((): void => {
        cancelClose();
        timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
    }, [cancelClose]);

    return { open, onOpenChange, handlers: { onPointerEnter: cancelClose, onPointerLeave } };
}
