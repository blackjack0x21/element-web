/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { EMOJI } from "@matrix-org/emojibase-bindings";

const SHORTCODE_REGEX = /:([+\w-]+):/g;

let unicodeByShortcode: Map<string, string> | undefined;

/** Built on first use, as most sessions never need it. */
function getUnicodeByShortcode(): Map<string, string> {
    if (!unicodeByShortcode) {
        unicodeByShortcode = new Map();
        for (const emoji of EMOJI) {
            for (const shortcode of emoji.shortcodes) unicodeByShortcode.set(shortcode, emoji.unicode);
        }
    }
    return unicodeByShortcode;
}

/**
 * Replaces complete `:shortcode:` sequences (e.g. `:sob:`) with the matching emoji.
 * Unknown shortcodes, and text without a closing colon, are left untouched.
 */
export function replaceEmojiShortcodes(text: string): string {
    return text.replace(SHORTCODE_REGEX, (match, shortcode: string) => getUnicodeByShortcode().get(shortcode) ?? match);
}
