/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { act, renderHook } from "@test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHoverSubMenu } from "./useHoverSubMenu";

describe("useHoverSubMenu", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("closes shortly after the pointer leaves", () => {
        const { result } = renderHook(() => useHoverSubMenu());
        act(() => result.current.onOpenChange(true));
        expect(result.current.open).toBe(true);

        act(() => result.current.handlers.onPointerLeave());
        expect(result.current.open).toBe(true);

        act(() => vi.advanceTimersByTime(200));
        expect(result.current.open).toBe(false);
    });

    it("stays open if the pointer re-enters before the delay ends", () => {
        const { result } = renderHook(() => useHoverSubMenu());
        act(() => result.current.onOpenChange(true));

        act(() => result.current.handlers.onPointerLeave());
        act(() => result.current.handlers.onPointerEnter());
        act(() => vi.advanceTimersByTime(200));

        expect(result.current.open).toBe(true);
    });
});
