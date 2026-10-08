/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type IContent, type MatrixEvent } from "matrix-js-sdk/src/matrix";

/**
 * Event content key set to `true` on messages that should not notify anyone.
 * The homeserver ships a default push rule (`.org.matrix.custom.rule.silent`) which matches it.
 */
export const SILENT_MESSAGE_CONTENT_KEY = "org.matrix.custom.silent";

/**
 * Matches the `@silent` prefix that the user types at the start of a message, along with the spaces after it.
 */
const SILENT_PREFIX_REGEX = /^@silent +/;

/**
 * Get the length of the `@silent ` prefix at the start of the given text.
 * A message made only of the prefix is sent as-is, like any other text.
 * @param text - the text the user typed
 * @param hasContentAfterText - whether more content (e.g. a pill) follows the text
 * @returns the length of the prefix, including trailing spaces, or 0 if the text has no prefix or nothing after it
 */
export function getSilentPrefixLength(text: string, hasContentAfterText = false): number {
    const match = SILENT_PREFIX_REGEX.exec(text);
    if (!match) return 0;
    const hasContent = hasContentAfterText || text.slice(match[0].length).trim() !== "";
    return hasContent ? match[0].length : 0;
}

/**
 * Mark the given message content as silent.
 * @param content - the content to modify
 */
export function attachSilentFlag(content: IContent): void {
    content[SILENT_MESSAGE_CONTENT_KEY] = true;
}

/**
 * Whether the given event was sent as a silent message.
 * The original content is checked so that the flag survives edits.
 * @param event - the event to check
 */
export function isSilentMessage(event: MatrixEvent): boolean {
    return event.getOriginalContent()[SILENT_MESSAGE_CONTENT_KEY] === true;
}
