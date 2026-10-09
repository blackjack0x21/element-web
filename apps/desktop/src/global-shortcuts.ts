/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import fs from "node:fs";
import path from "node:path";
import { app, globalShortcut } from "electron";

import Store from "./store.js";
import { PortalShortcuts } from "./portal-shortcuts.js";

/** Things the user can trigger with a system-wide shortcut. Mirrored in the web app. */
export const GLOBAL_SHORTCUT_ACTIONS = ["toggleMicrophone", "toggleCamera", "toggleDeafen", "hangUp"] as const;
export type GlobalShortcutAction = (typeof GLOBAL_SHORTCUT_ACTIONS)[number];

/** Accelerator (Electron syntax, e.g. "Ctrl+Shift+M") per action. A missing or empty entry means unbound. */
export type GlobalShortcutBindings = Partial<Record<GlobalShortcutAction, string>>;

export interface GlobalShortcutStatus {
    /** The stored bindings. */
    bindings: GlobalShortcutBindings;
    /** Whether each bound action was accepted by the system. Unbound actions are absent. */
    registered: Partial<Record<GlobalShortcutAction, boolean>>;
    /**
     * Set on Wayland, where the desktop environment owns the key assignment: the accelerator is only a
     * suggestion and the user may need to confirm or change it in the system's shortcut settings.
     */
    managedBySystem: boolean;
}

const isWayland = (): boolean => process.platform === "linux" && process.env.XDG_SESSION_TYPE === "wayland";

let registered: GlobalShortcutStatus["registered"] = {};

function isAction(key: string): key is GlobalShortcutAction {
    return (GLOBAL_SHORTCUT_ACTIONS as readonly string[]).includes(key);
}

/** Keeps only known actions with non-empty string accelerators, so stored junk can't reach Electron. */
function sanitise(bindings: unknown): GlobalShortcutBindings {
    const result: GlobalShortcutBindings = {};
    if (typeof bindings !== "object" || bindings === null) return result;
    for (const [action, accelerator] of Object.entries(bindings)) {
        if (isAction(action) && typeof accelerator === "string" && accelerator.trim() !== "") {
            result[action] = accelerator.trim();
        }
    }
    return result;
}

/** Tells the renderer a shortcut was pressed. Works while the window is hidden or minimised. */
function trigger(action: GlobalShortcutAction): void {
    console.debug(`Global shortcut pressed: ${action}`);
    global.mainWindow?.webContents.send("globalShortcut", action);
}

export function getGlobalShortcutBindings(): GlobalShortcutBindings {
    return sanitise(Store.instance?.get("globalShortcuts"));
}

export function getGlobalShortcutStatus(): GlobalShortcutStatus {
    return { bindings: getGlobalShortcutBindings(), registered: { ...registered }, managedBySystem: isWayland() };
}

const DESCRIPTIONS: Record<GlobalShortcutAction, string> = {
    toggleMicrophone: "Toggle microphone",
    toggleCamera: "Toggle camera",
    toggleDeafen: "Toggle deafen",
    hangUp: "Leave call",
};

let portal: PortalShortcuts | undefined;
/** Set once the portal has failed, so we fall back to Electron's own shortcuts instead of retrying. */
let portalUnavailable = false;

/** The app ID Electron registered with the portal: `desktopName` in package.json, without ".desktop". */
function getPortalAppId(): string | null {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), "package.json"), "utf8"));
        return typeof pkg.desktopName === "string" ? pkg.desktopName.replace(/\.desktop$/, "") : null;
    } catch {
        return null;
    }
}

/** Shortcut ids carry the accelerator, so the desktop environment treats a new key as a new shortcut. */
const portalId = (action: GlobalShortcutAction, accelerator: string): string => `${action}:${accelerator}`;

/** Registers through the portal. Returns false when it can't be used at all. */
async function registerWithPortal(bindings: GlobalShortcutBindings): Promise<boolean> {
    const appId = getPortalAppId();
    if (!appId || portalUnavailable) return false;

    try {
        portal ??= new PortalShortcuts(appId, (id) => {
            const action = id.split(":")[0];
            if (isAction(action)) trigger(action);
        });
        const entries = Object.entries(bindings) as [GlobalShortcutAction, string][];
        const bound = await portal.bind(
            entries.map(([action, accelerator]) => ({
                id: portalId(action, accelerator),
                description: `Element: ${DESCRIPTIONS[action]}`,
                accelerator,
            })),
        );
        for (const [action, accelerator] of entries) {
            registered[action] = bound.has(portalId(action, accelerator));
            console.debug(`Portal global shortcut ${action} (${accelerator}): ${registered[action]}`);
        }
        return true;
    } catch (e) {
        console.warn("Global shortcuts portal unavailable, using Electron's shortcuts", e);
        portalUnavailable = true;
        await portal?.dispose().catch(() => {});
        portal = undefined;
        return false;
    }
}

/** Replaces every registered shortcut with the stored bindings. */
export async function registerGlobalShortcuts(): Promise<void> {
    globalShortcut.unregisterAll();
    registered = {};
    const bindings = getGlobalShortcutBindings();

    if (isWayland() && (await registerWithPortal(bindings))) return;

    for (const [action, accelerator] of Object.entries(bindings) as [GlobalShortcutAction, string][]) {
        try {
            registered[action] = globalShortcut.register(accelerator, () => trigger(action));
            console.debug(`Registered global shortcut ${action} (${accelerator}): ${registered[action]}`);
        } catch (e) {
            // Electron throws on accelerators it cannot parse
            console.warn(`Invalid global shortcut for ${action}: ${accelerator}`, e);
            registered[action] = false;
        }
    }
}

/** Stores new bindings and applies them, returning how each one fared. */
export async function setGlobalShortcutBindings(bindings: unknown): Promise<GlobalShortcutStatus> {
    Store.instance?.set("globalShortcuts", sanitise(bindings));
    await registerGlobalShortcuts();
    return getGlobalShortcutStatus();
}

export function unregisterGlobalShortcuts(): void {
    globalShortcut.unregisterAll();
    registered = {};
    void portal?.dispose();
    portal = undefined;
}
