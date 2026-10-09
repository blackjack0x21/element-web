/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { acceleratorToPortalTrigger } from "./portal-shortcuts.js";

describe("acceleratorToPortalTrigger", () => {
    it("uppercases modifiers and lowercases letters", () => {
        expect(acceleratorToPortalTrigger("Ctrl+Shift+M")).toBe("CTRL+SHIFT+m");
        expect(acceleratorToPortalTrigger("Alt+Super+D")).toBe("ALT+LOGO+d");
        expect(acceleratorToPortalTrigger("CommandOrControl+K")).toBe("CTRL+k");
    });

    it("keeps function keys, digits and arrows", () => {
        expect(acceleratorToPortalTrigger("F14")).toBe("F14");
        expect(acceleratorToPortalTrigger("Ctrl+5")).toBe("CTRL+5");
        expect(acceleratorToPortalTrigger("Alt+Up")).toBe("ALT+Up");
    });

    it("translates keys with different XKB names", () => {
        expect(acceleratorToPortalTrigger("Ctrl+Space")).toBe("CTRL+space");
        expect(acceleratorToPortalTrigger("Ctrl+/")).toBe("CTRL+slash");
        expect(acceleratorToPortalTrigger("num5")).toBe("KP_5");
        expect(acceleratorToPortalTrigger("MediaPlayPause")).toBe("XF86AudioPlay");
        expect(acceleratorToPortalTrigger("Ctrl++")).toBe("CTRL+plus");
    });

    it("rejects unknown modifiers and keys", () => {
        expect(acceleratorToPortalTrigger("Hyper+M")).toBeNull();
        expect(acceleratorToPortalTrigger("Ctrl+Nonsense")).toBeNull();
        expect(acceleratorToPortalTrigger("")).toBeNull();
    });
});
