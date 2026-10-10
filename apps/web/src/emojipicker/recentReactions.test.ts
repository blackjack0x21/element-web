/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, it, expect, beforeEach, vi } from "vitest";

import SettingsStore from "../settings/SettingsStore";
import { SettingLevel } from "../settings/SettingLevel";
import * as recentEmoji from "./recent";
import { add, get } from "./recentReactions";

describe("recentReactions", () => {
    let stored: { emoji: string; total: number }[];

    beforeEach(() => {
        stored = [];
        vi.spyOn(SettingsStore, "getValue").mockImplementation(() => stored);
        vi.spyOn(SettingsStore, "setValue").mockImplementation(async (_name, _room, _level, value) => {
            stored = value as typeof stored;
        });
        vi.spyOn(recentEmoji, "get").mockReturnValue([]);
    });

    it("stores reactions in their own setting and counts repeat use", () => {
        add("👍");
        add("🎉");
        add("👍");

        expect(SettingsStore.setValue).toHaveBeenLastCalledWith("recent_reactions", null, SettingLevel.ACCOUNT, [
            { emoji: "👍", total: 2 },
            { emoji: "🎉", total: 1 },
        ]);
    });

    it("returns the most used reactions without touching favourite emoji when there are enough", () => {
        stored = [
            { emoji: "🎉", total: 1 },
            { emoji: "👍", total: 5 },
            { emoji: "❤️", total: 3 },
        ];
        vi.mocked(recentEmoji.get).mockReturnValue(["😀"]);

        expect(get(2)).toEqual(["👍", "❤️"]);
    });

    it("fills missing slots from favourite emoji without duplicates", () => {
        stored = [{ emoji: "👍", total: 5 }];
        vi.mocked(recentEmoji.get).mockReturnValue(["👍", "😀", "🔥"]);

        expect(get(3)).toEqual(["👍", "😀", "🔥"]);
    });
});
