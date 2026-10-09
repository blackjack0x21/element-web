/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/src/logger";

import { CallStore } from "../stores/CallStore";
import { ElementCall } from "../models/Call";

/** Actions Element Desktop can bind to a system-wide shortcut. Mirrors the desktop app's list. */
export const GLOBAL_SHORTCUT_ACTIONS = ["toggleMicrophone", "toggleCamera", "toggleDeafen", "hangUp"] as const;
export type GlobalShortcutAction = (typeof GLOBAL_SHORTCUT_ACTIONS)[number];

/** What the desktop app knows about the shortcuts, see `global-shortcuts.ts` there. */
export interface GlobalShortcutStatus {
    bindings: Partial<Record<GlobalShortcutAction, string>>;
    registered: Partial<Record<GlobalShortcutAction, boolean>>;
    managedBySystem: boolean;
}

export function isGlobalShortcutAction(action: unknown): action is GlobalShortcutAction {
    return (GLOBAL_SHORTCUT_ACTIONS as readonly unknown[]).includes(action);
}

/**
 * Applies a pressed global shortcut to the call the user is in. Does nothing when there is no call.
 */
export async function handleGlobalShortcut(action: GlobalShortcutAction): Promise<void> {
    const calls = [...CallStore.instance.connectedCalls];
    const call = calls.find((c): c is ElementCall => c instanceof ElementCall);
    if (!call) {
        logger.info(`Ignoring global shortcut ${action}: no connected Element Call (${calls.length} other calls)`);
        return;
    }
    logger.info(`Handling global shortcut ${action}`);

    try {
        switch (action) {
            case "toggleMicrophone":
                await call.toggleMicrophone();
                break;
            case "toggleCamera":
                await call.toggleCamera();
                break;
            case "toggleDeafen":
                await call.toggleDeafen();
                break;
            case "hangUp":
                await call.disconnect();
                break;
        }
    } catch (e) {
        logger.warn(`Failed to handle global shortcut ${action}`, e);
    }
}
