/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, {
    cloneElement,
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type JSX,
    type KeyboardEvent,
    type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

import { _t } from "../../../languageHandler";
import Field from "../elements/Field";
import UIStore from "../../../stores/UIStore";
import { EmojiButton } from "../rooms/EmojiButton";
import EmojiProvider from "../../../autocomplete/EmojiProvider";
import { type ICompletion } from "../../../autocomplete/Autocompleter";
import { replaceEmojiShortcodes } from "../../../utils/replaceEmojiShortcodes";

const MAX_SUGGESTIONS = 8;
/** Matches the max-height of the suggestion list in CSS */
const SUGGESTIONS_HEIGHT = 220;
const SUGGESTIONS_GAP = 4;

interface Props {
    value: string;
    onChange: (value: string) => void;
    /** Called when the user presses Enter and no suggestion is being picked. */
    onSubmit: () => void;
}

/**
 * Single-line text field for a file caption. Replaces complete `:shortcode:` text with the emoji,
 * suggests emoji while a shortcode is being typed, and has a button to open the emoji picker.
 */
export function UploadCaptionField({ value, onChange, onSubmit }: Props): JSX.Element {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Created once: it only reads the emoji data and the user's recent emoji
    const provider = useRef<EmojiProvider>(null);
    const [suggestions, setSuggestions] = useState<ICompletion[]>([]);
    // -1 means the user has not picked a suggestion yet
    const [selected, setSelected] = useState(-1);
    // Guards against a slow lookup overwriting the result of a newer one
    const lookupId = useRef(0);

    useEffect(() => {
        provider.current = new EmojiProvider();
        return () => provider.current?.destroy();
    }, []);

    const updateSuggestions = useCallback(async (text: string, caret: number): Promise<void> => {
        const id = ++lookupId.current;
        const found =
            (await provider.current?.getCompletions(text, { start: caret, end: caret }, false, MAX_SUGGESTIONS)) ?? [];
        if (id !== lookupId.current) return;
        setSuggestions(found.slice(0, MAX_SUGGESTIONS));
        setSelected(-1);
    }, []);

    const setCursor = (position: number): void => {
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(position, position);
        });
    };

    const onInputChange = (ev: ChangeEvent<HTMLInputElement>): void => {
        const input = ev.target;
        const caret = input.selectionStart ?? input.value.length;
        const replaced = replaceEmojiShortcodes(input.value);
        onChange(replaced);
        if (replaced !== input.value) {
            // Keep the cursor where the user was typing, which is after the text that got shorter.
            const cursor = Math.max(0, replaced.length - (input.value.length - caret));
            setCursor(cursor);
            void updateSuggestions(replaced, cursor);
        } else {
            void updateSuggestions(input.value, caret);
        }
    };

    // Moving the cursor with the arrow keys or the mouse can enter or leave a shortcode
    const onCursorMoved = (ev: SyntheticEvent<HTMLInputElement>): void => {
        const input = ev.currentTarget;
        void updateSuggestions(input.value, input.selectionStart ?? input.value.length);
    };

    const closeSuggestions = (): void => {
        lookupId.current++;
        setSuggestions([]);
        setSelected(-1);
    };

    const pickSuggestion = (completion: ICompletion): void => {
        // The matched range includes the whitespace before the shortcode, which must stay
        const { end } = completion.range;
        const start =
            completion.range.start + (value.slice(completion.range.start, end).match(/^\s*/)?.[0].length ?? 0);
        onChange(value.slice(0, start) + completion.completion + value.slice(end));
        setCursor(start + completion.completion.length);
        closeSuggestions();
    };

    const addEmoji = (unicode: string): boolean => {
        const input = inputRef.current;
        const from = input?.selectionStart ?? value.length;
        const to = input?.selectionEnd ?? value.length;
        onChange(value.slice(0, from) + unicode + value.slice(to));
        setCursor(from + unicode.length);
        return true;
    };

    const onKeyDown = (ev: KeyboardEvent<HTMLInputElement>): void => {
        if (suggestions.length > 0) {
            switch (ev.key) {
                case "ArrowDown":
                    ev.preventDefault();
                    setSelected((selected + 1) % suggestions.length);
                    return;
                case "ArrowUp":
                    ev.preventDefault();
                    setSelected(selected <= 0 ? suggestions.length - 1 : selected - 1);
                    return;
                case "Tab":
                    ev.preventDefault();
                    pickSuggestion(suggestions[Math.max(selected, 0)]);
                    return;
                case "Escape":
                    // Close only the suggestions, not the whole dialog
                    ev.preventDefault();
                    ev.stopPropagation();
                    closeSuggestions();
                    return;
                case "Enter":
                    if (selected >= 0) {
                        ev.preventDefault();
                        pickSuggestion(suggestions[selected]);
                        return;
                    }
                    break;
            }
        }
        if (ev.key === "Enter") {
            ev.preventDefault();
            onSubmit();
        }
    };

    /**
     * The list is a popup over the dialog rather than part of its layout, so it is drawn in a portal
     * (the dialog scrolls, which would otherwise clip it) and placed next to the field.
     */
    let popup: JSX.Element | undefined;
    const fieldRect = wrapperRef.current?.querySelector(".mx_Field")?.getBoundingClientRect();
    if (suggestions.length > 0 && fieldRect) {
        const fitsBelow = fieldRect.bottom + SUGGESTIONS_GAP + SUGGESTIONS_HEIGHT <= UIStore.instance.windowHeight;
        popup = createPortal(
            <div
                className="mx_UploadCaptionField_suggestions"
                role="listbox"
                aria-label={_t("composer|autocomplete|emoji_a11y")}
                style={{
                    left: fieldRect.left,
                    width: fieldRect.width,
                    ...(fitsBelow
                        ? { top: fieldRect.bottom + SUGGESTIONS_GAP }
                        : { bottom: UIStore.instance.windowHeight - fieldRect.top + SUGGESTIONS_GAP }),
                }}
            >
                {suggestions.map((completion, i) =>
                    cloneElement(completion.component, {
                        "key": completion.completion,
                        "aria-selected": i === selected,
                        "className": i === selected ? "mx_UploadCaptionField_selected" : undefined,
                        // mousedown rather than click: the input must not lose focus first
                        "onMouseDown": (ev: React.MouseEvent) => {
                            ev.preventDefault();
                            pickSuggestion(completion);
                        },
                    } as Partial<React.HTMLAttributes<HTMLElement>>),
                )}
            </div>,
            document.body,
        );
    }

    return (
        <div className="mx_UploadCaptionField" ref={wrapperRef}>
            <Field
                className="mx_UploadCaptionField_field"
                type="text"
                label={_t("upload_file|caption_label")}
                value={value}
                inputRef={inputRef}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                onKeyUp={(ev: KeyboardEvent<HTMLInputElement>) => {
                    if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") onCursorMoved(ev);
                }}
                onClick={onCursorMoved}
                onBlur={closeSuggestions}
                postfixComponent={<EmojiButton className="mx_UploadCaptionField_emojiButton" addEmoji={addEmoji} />}
            />
            {popup}
        </div>
    );
}
