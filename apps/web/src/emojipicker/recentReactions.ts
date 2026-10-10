/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { orderBy } from "lodash";

import SettingsStore from "../settings/SettingsStore";
import { SettingLevel } from "../settings/SettingLevel";
import * as recentEmoji from "./recent";
import { type RecentEmojiData } from "./recent";

const SETTING_NAME = "recent_reactions";

// Enough history to rank by usage without growing the account data unboundedly.
const STORAGE_LIMIT = 50;

function getRecentReactions(): RecentEmojiData {
    return SettingsStore.getValue(SETTING_NAME) || [];
}

/** Records that the user reacted to a message with `emoji`, separately from emoji used elsewhere. */
export function add(emoji: string): void {
    const recents = getRecentReactions();
    const i = recents.findIndex((entry) => entry.emoji === emoji);

    let newEntry: RecentEmojiData[number];
    if (i >= 0) {
        [newEntry] = recents.splice(i, 1);
        newEntry.total++;
    } else {
        newEntry = { emoji, total: 1 };
    }

    void SettingsStore.setValue(
        SETTING_NAME,
        null,
        SettingLevel.ACCOUNT,
        [newEntry, ...recents].slice(0, STORAGE_LIMIT),
    );
}

/**
 * Returns the user's most used reaction emoji. If fewer than `limit` have been used as reactions,
 * the gap is filled with the user's most used emoji overall.
 */
export function get(limit: number): string[] {
    const reactions = orderBy(getRecentReactions(), "total", "desc").map(({ emoji }) => emoji);
    const result = reactions.slice(0, limit);
    if (result.length >= limit) return result;

    for (const emoji of recentEmoji.get()) {
        if (result.length >= limit) break;
        if (!result.includes(emoji)) result.push(emoji);
    }
    return result;
}
