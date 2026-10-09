/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import React, { type JSX, useCallback, useEffect, useState } from "react";
import { Text } from "@vector-im/compound-web";
import { logger } from "matrix-js-sdk/src/logger";

import { _t, _td } from "../../../languageHandler";
import PlatformPeg from "../../../PlatformPeg";
import SdkConfig from "../../../SdkConfig";
import AccessibleButton from "../elements/AccessibleButton";
import {
    GLOBAL_SHORTCUT_ACTIONS,
    type GlobalShortcutAction,
    type GlobalShortcutStatus,
} from "../../../utils/globalShortcuts";
import { keyEventToAccelerator } from "../../../utils/keyEventToAccelerator";

const LABELS: Record<GlobalShortcutAction, TranslationKey> = {
    toggleMicrophone: _td("settings|global_shortcuts|toggle_microphone"),
    toggleCamera: _td("settings|global_shortcuts|toggle_camera"),
    toggleDeafen: _td("settings|global_shortcuts|toggle_deafen"),
    hangUp: _td("settings|global_shortcuts|hang_up"),
};

interface RowProps {
    action: GlobalShortcutAction;
    accelerator: string | undefined;
    /** False when the system refused the shortcut, e.g. because another app already uses it. */
    registered: boolean | undefined;
    onChange: (action: GlobalShortcutAction, accelerator: string | undefined) => void;
}

function GlobalShortcutRow({ action, accelerator, registered, onChange }: Readonly<RowProps>): JSX.Element {
    const [recording, setRecording] = useState(false);

    const onKeyDown = (ev: React.KeyboardEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.key === "Escape") {
            setRecording(false);
            return;
        }
        const newAccelerator = keyEventToAccelerator(ev.nativeEvent);
        if (!newAccelerator) return;
        setRecording(false);
        onChange(action, newAccelerator);
    };

    return (
        <div className="mx_GlobalShortcutSettings_row">
            <Text as="span" size="md" weight="medium">
                {_t(LABELS[action])}
            </Text>
            <div className="mx_GlobalShortcutSettings_controls">
                <AccessibleButton
                    kind={recording ? "primary_outline" : "secondary"}
                    onClick={() => setRecording(true)}
                    onBlur={() => setRecording(false)}
                    onKeyDown={recording ? onKeyDown : undefined}
                    aria-label={_t(LABELS[action])}
                >
                    {recording
                        ? _t("settings|global_shortcuts|press_keys")
                        : (accelerator ?? _t("settings|global_shortcuts|unbound"))}
                </AccessibleButton>
                {accelerator && (
                    <AccessibleButton kind="link_inline" onClick={() => onChange(action, undefined)}>
                        {_t("action|clear")}
                    </AccessibleButton>
                )}
            </div>
            {accelerator && registered === false && (
                <Text as="span" size="sm" className="mx_GlobalShortcutSettings_error">
                    {_t("settings|global_shortcuts|not_registered")}
                </Text>
            )}
        </div>
    );
}

/**
 * Lets the user pick system-wide shortcuts for controlling a call while Element is in the background.
 * Renders nothing on platforms that can't do this (the browser).
 */
export function GlobalShortcutSettings(): JSX.Element | null {
    const platform = PlatformPeg.get();
    const [status, setStatus] = useState<GlobalShortcutStatus | null>(null);

    useEffect(() => {
        platform?.getGlobalShortcuts().then(
            (s) => setStatus(s ?? null),
            (e) => logger.warn("Failed to read global shortcuts", e),
        );
    }, [platform]);

    const onChange = useCallback(
        async (action: GlobalShortcutAction, accelerator: string | undefined) => {
            if (!platform || !status) return;
            const bindings = { ...status.bindings };
            if (accelerator) bindings[action] = accelerator;
            else delete bindings[action];
            try {
                setStatus(await platform.setGlobalShortcuts(bindings));
            } catch (e) {
                logger.warn("Failed to set global shortcuts", e);
            }
        },
        [platform, status],
    );

    if (!platform?.supportsGlobalShortcuts() || !status) return null;

    return (
        <div className="mx_GlobalShortcutSettings">
            {GLOBAL_SHORTCUT_ACTIONS.map((action) => (
                <GlobalShortcutRow
                    key={action}
                    action={action}
                    accelerator={status.bindings[action]}
                    registered={status.registered[action]}
                    onChange={onChange}
                />
            ))}
            {status.managedBySystem && (
                <Text as="p" size="sm">
                    {_t("settings|global_shortcuts|managed_by_system", { brand: SdkConfig.get().brand })}
                </Text>
            )}
        </div>
    );
}
