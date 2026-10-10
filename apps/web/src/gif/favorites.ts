/*
Copyright 2026 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import SettingsStore from "../settings/SettingsStore";
import { SettingLevel } from "../settings/SettingLevel";
import { type KlipyGifResult } from "./KlipyGifService";

const SETTING_NAME = "gif_favorites";

/** Maximum number of favourites kept, to stop the account data event growing without bound. */
export const FAVORITES_LIMIT = 200;

/** Formats `pickBestFormat` can choose from, the only ones worth persisting. */
const KEPT_FORMATS = ["gif", "tinygif", "mediumgif", "nanogif", "webp"] as const;

/** Copy of a GIF with only the fields needed to preview and send it again. */
function slim(gif: KlipyGifResult): KlipyGifResult {
    const media_formats = {} as KlipyGifResult["media_formats"];
    for (const key of KEPT_FORMATS) {
        const format = gif.media_formats[key];
        if (format) media_formats[key] = format;
    }
    return { ...gif, media_formats };
}

/** The saved favourite GIFs, most recently added first. */
export function getFavorites(): KlipyGifResult[] {
    return SettingsStore.getValue(SETTING_NAME) || [];
}

/** Adds the GIF to the favourites, or removes it if it is already there. */
export function toggleFavorite(gif: KlipyGifResult): void {
    const favorites = getFavorites();
    const others = favorites.filter((fav) => fav.id !== gif.id);
    const next = others.length === favorites.length ? [slim(gif), ...others].slice(0, FAVORITES_LIMIT) : others;
    void SettingsStore.setValue(SETTING_NAME, null, SettingLevel.ACCOUNT, next);
}
