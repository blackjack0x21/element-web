/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { keyEventToAccelerator } from "./keyEventToAccelerator";

const press = (code: string, mods: Partial<Record<"ctrlKey" | "altKey" | "shiftKey" | "metaKey", boolean>> = {}) =>
    keyEventToAccelerator({ code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

describe("keyEventToAccelerator", () => {
    it("names modifiers in a fixed order", () => {
        expect(press("KeyM", { shiftKey: true, ctrlKey: true })).toBe("Ctrl+Shift+M");
        expect(press("KeyD", { metaKey: true, altKey: true })).toBe("Alt+Super+D");
    });

    it("maps digits, arrows and punctuation", () => {
        expect(press("Digit5", { ctrlKey: true })).toBe("Ctrl+5");
        expect(press("ArrowUp", { altKey: true })).toBe("Alt+Up");
        expect(press("Slash", { ctrlKey: true })).toBe("Ctrl+/");
    });

    it("ignores a lone modifier", () => {
        expect(press("ShiftLeft", { shiftKey: true })).toBeNull();
        expect(press("MetaRight", { metaKey: true })).toBeNull();
    });

    it("allows keys without modifiers", () => {
        expect(press("KeyM")).toBe("M");
        expect(press("Numpad5")).toBe("num5");
        expect(press("F9")).toBe("F9");
        expect(press("MediaPlayPause")).toBe("MediaPlayPause");
    });

    it("rejects keys with no accelerator name", () => {
        expect(press("IntlBackslash", { ctrlKey: true })).toBeNull();
    });
});
