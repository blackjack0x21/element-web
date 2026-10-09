/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

/** Keys whose `code` differs from the name Electron expects in an accelerator. */
const CODE_NAMES: Record<string, string> = {
    Space: "Space",
    Enter: "Return",
    NumpadEnter: "Return",
    Escape: "Escape",
    Backspace: "Backspace",
    Tab: "Tab",
    Delete: "Delete",
    Insert: "Insert",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Minus: "-",
    Equal: "=",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    BracketLeft: "[",
    BracketRight: "]",
    Backquote: "`",
    MediaPlayPause: "MediaPlayPause",
    MediaTrackNext: "MediaNextTrack",
    MediaTrackPrevious: "MediaPreviousTrack",
    MediaStop: "MediaStop",
};

/** The key part of an accelerator for a key press, or null for keys Electron has no name for. */
function keyName(code: string): string | null {
    if (CODE_NAMES[code]) return CODE_NAMES[code];
    const letter = /^Key([A-Z])$/.exec(code);
    if (letter) return letter[1];
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
    if (digit) return code.startsWith("Numpad") ? `num${digit[1]}` : digit[1];
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
    return null;
}

const MODIFIER_CODES = /^(Control|Shift|Alt|Meta|OS)(Left|Right)?$/;

/**
 * Turns a key press into an Electron accelerator such as "Ctrl+Shift+M".
 *
 * @returns null while only modifiers are held, or for keys that can't be bound.
 */
export function keyEventToAccelerator(
    ev: Pick<KeyboardEvent, "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">,
): string | null {
    if (MODIFIER_CODES.test(ev.code)) return null;
    const key = keyName(ev.code);
    if (!key) return null;

    const parts: string[] = [];
    if (ev.ctrlKey) parts.push("Ctrl");
    if (ev.altKey) parts.push("Alt");
    if (ev.shiftKey) parts.push("Shift");
    if (ev.metaKey) parts.push("Super");
    parts.push(key);
    return parts.join("+");
}
