/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { describe, it, expect } from "vitest";

import { replaceEmojiShortcodes } from "./replaceEmojiShortcodes";

describe("replaceEmojiShortcodes", () => {
    it("replaces a complete shortcode", () => {
        expect(replaceEmojiShortcodes("so sad :sob: today")).toBe("so sad 😭 today");
    });

    it("replaces several shortcodes", () => {
        expect(replaceEmojiShortcodes(":sob::sob:")).toBe("😭😭");
    });

    it("leaves unknown shortcodes, unfinished shortcodes and plain text alone", () => {
        expect(replaceEmojiShortcodes(":notanemoji: :sob 12:30:45")).toBe(":notanemoji: :sob 12:30:45");
    });
});
