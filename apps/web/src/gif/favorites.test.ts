/*
Copyright 2026 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import SettingsStore from "../settings/SettingsStore";
import { SettingLevel } from "../settings/SettingLevel";
import { FAVORITES_LIMIT, getFavorites, toggleFavorite } from "./favorites";
import { type KlipyGifResult } from "./KlipyGifService";

function mkGif(id: string): KlipyGifResult {
    const format = { url: `https://klipy.com/${id}.gif`, dims: [10, 10] as [number, number], duration: 1, size: 1 };
    return {
        id,
        title: id,
        content_description: id,
        media_formats: { gif: format, tinygif: format, mediumgif: format, nanogif: format },
        created: 0,
        url: `https://klipy.com/view/${id}`,
    };
}

describe("gif favorites", () => {
    let stored: KlipyGifResult[];

    beforeEach(() => {
        stored = [];
        vi.spyOn(SettingsStore, "getValue").mockImplementation(() => stored);
        vi.spyOn(SettingsStore, "setValue").mockImplementation(async (_name, _room, _level, value) => {
            stored = value as KlipyGifResult[];
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns an empty list when nothing is saved", () => {
        vi.mocked(SettingsStore.getValue).mockReturnValue(undefined as unknown as KlipyGifResult[]);
        expect(getFavorites()).toEqual([]);
    });

    it("adds a GIF to the front at account level", () => {
        toggleFavorite(mkGif("a"));
        toggleFavorite(mkGif("b"));

        expect(stored.map((g) => g.id)).toEqual(["b", "a"]);
        expect(SettingsStore.setValue).toHaveBeenCalledWith("gif_favorites", null, SettingLevel.ACCOUNT, stored);
    });

    it("removes a GIF that is already a favourite", () => {
        toggleFavorite(mkGif("a"));
        toggleFavorite(mkGif("b"));
        toggleFavorite(mkGif("a"));

        expect(stored.map((g) => g.id)).toEqual(["b"]);
    });

    it("only keeps the formats needed to preview and send the GIF", () => {
        const gif = mkGif("a");
        (gif.media_formats as any).mp4 = gif.media_formats.gif;
        toggleFavorite(gif);

        expect(Object.keys(stored[0].media_formats).sort()).toEqual(["gif", "mediumgif", "nanogif", "tinygif"]);
    });

    it("drops the oldest favourites past the limit", () => {
        stored = Array.from({ length: FAVORITES_LIMIT }, (_, i) => mkGif(`old${i}`));
        toggleFavorite(mkGif("new"));

        expect(stored).toHaveLength(FAVORITES_LIMIT);
        expect(stored[0].id).toBe("new");
        expect(stored.some((g) => g.id === `old${FAVORITES_LIMIT - 1}`)).toBe(false);
    });
});
