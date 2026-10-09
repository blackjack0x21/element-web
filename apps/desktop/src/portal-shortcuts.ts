/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import dbus, { type MessageBus } from "@homebridge/dbus-native";

const PORTAL = "org.freedesktop.portal.Desktop";
const PORTAL_PATH = "/org/freedesktop/portal/desktop";
const SHORTCUTS_IFACE = "org.freedesktop.portal.GlobalShortcuts";
const REQUEST_IFACE = "org.freedesktop.portal.Request";

/** Electron accelerator key names that differ from the XKB names the shortcuts portal expects. */
const KEY_NAMES: Record<string, string> = {
    "Space": "space",
    "Return": "Return",
    "Enter": "Return",
    "Backspace": "BackSpace",
    "PageUp": "Page_Up",
    "PageDown": "Page_Down",
    "Esc": "Escape",
    "-": "minus",
    "=": "equal",
    ",": "comma",
    ".": "period",
    "/": "slash",
    "\\": "backslash",
    ";": "semicolon",
    "'": "apostrophe",
    "[": "bracketleft",
    "]": "bracketright",
    "`": "grave",
    "MediaPlayPause": "XF86AudioPlay",
    "MediaStop": "XF86AudioStop",
    "MediaNextTrack": "XF86AudioNext",
    "MediaPreviousTrack": "XF86AudioPrev",
};

const MODIFIER_NAMES: Record<string, string> = {
    ctrl: "CTRL",
    control: "CTRL",
    commandorcontrol: "CTRL",
    cmdorctrl: "CTRL",
    alt: "ALT",
    option: "ALT",
    shift: "SHIFT",
    super: "LOGO",
    meta: "LOGO",
};

/**
 * Converts an Electron accelerator ("Ctrl+Shift+M") to the trigger syntax of the shortcuts portal
 * ("CTRL+SHIFT+m"). Returns null for a key the portal has no name for.
 */
export function acceleratorToPortalTrigger(accelerator: string): string | null {
    const parts = accelerator.split("+").filter((p) => p !== "");
    // A literal "+" key ends the string as "Ctrl++"
    if (accelerator.endsWith("++")) parts.push("plus");
    const key = parts.pop();
    if (!key) return null;

    const modifiers: string[] = [];
    for (const part of parts) {
        const mod = MODIFIER_NAMES[part.toLowerCase()];
        if (!mod) return null;
        modifiers.push(mod);
    }

    let name: string;
    if (KEY_NAMES[key]) name = KEY_NAMES[key];
    else if (/^[A-Za-z]$/.test(key)) name = key.toLowerCase();
    else if (/^num([0-9])$/.test(key)) name = `KP_${key.slice(3)}`;
    else if (/^(F([1-9]|1[0-9]|2[0-4])|[0-9]|Up|Down|Left|Right|Home|End|Insert|Delete|Tab|Escape|plus)$/.test(key)) {
        name = key;
    } else return null;

    return [...modifiers, name].join("+");
}

export interface PortalShortcut {
    /** Identifies the shortcut in `onActivated`. */
    id: string;
    description: string;
    /** Electron accelerator suggested to the desktop environment. */
    accelerator: string;
}

/** The shortcut ids the desktop environment accepted with a key assigned. */
export type PortalBindResult = Set<string>;

type Variant = [string, unknown];
type Dict = Array<[string, Variant]>;

/** Reads a value from an a{sv} dictionary. A decoded variant is [signature, [value]]. */
function dictGet(dict: Dict | undefined, key: string): unknown {
    return (dict?.find(([k]) => k === key)?.[1]?.[1] as unknown[] | undefined)?.[0];
}

/**
 * A session with the XDG GlobalShortcuts portal, which is how Wayland compositors let an app receive
 * keys while another window has focus. Electron's own globalShortcut can't be relied on there: it
 * names every function key the same, so the desktop environment can't tell them apart.
 */
export class PortalShortcuts {
    private bus?: MessageBus;
    private counter = 0;
    private sessionPath?: string;
    private listening = false;

    public constructor(
        private readonly appId: string,
        private readonly onActivated: (id: string) => void,
    ) {}

    private invoke(
        member: string,
        signature: string,
        body: unknown[],
        iface = SHORTCUTS_IFACE,
        path = PORTAL_PATH,
        destination = PORTAL,
    ): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.bus!.invoke(
                { path, destination, interface: iface, member, signature, body },
                (err: { message?: string } | undefined, value: unknown) =>
                    err ? reject(new Error(err.message ?? JSON.stringify(err))) : resolve(value),
            );
        });
    }

    /** Calls a portal method that answers through a Request object and waits for that answer. */
    private async request(member: string, build: (token: string) => unknown[], signature: string): Promise<Dict> {
        const token = `element${++this.counter}`;
        const sender = this.bus!.name!.slice(1).replace(/\./g, "_");
        const requestPath = `/org/freedesktop/portal/desktop/request/${sender}/${token}`;

        const response = new Promise<Dict>((resolve, reject) => {
            const onMessage = (msg: { path?: string; interface?: string; member?: string; body?: unknown[] }): void => {
                if (msg.interface !== REQUEST_IFACE || msg.member !== "Response" || msg.path !== requestPath) return;
                this.bus!.connection.off("message", onMessage);
                const [code, results] = msg.body as [number, Dict];
                if (code === 0) resolve(results);
                else reject(new Error(`${member} was refused by the desktop environment (code ${code})`));
            };
            this.bus!.connection.on("message", onMessage);
        });
        // The answer can only arrive after the call, but the listener has to exist before it
        await this.invoke(member, signature, build(token));
        return await response;
    }

    private async connect(): Promise<void> {
        if (this.bus) return;
        this.bus = dbus.sessionBus();
        this.bus.connection.on("error", (e: Error) => console.warn("Shortcut portal connection error", e));
        await this.invoke("Register", "sa{sv}", [this.appId, []], "org.freedesktop.host.portal.Registry");

        // The bus only delivers the signals we ask for
        for (const iface of [REQUEST_IFACE, SHORTCUTS_IFACE]) {
            await this.invoke(
                "AddMatch",
                "s",
                [`type='signal',sender='${PORTAL}',interface='${iface}'`],
                "org.freedesktop.DBus",
                "/org/freedesktop/DBus",
                "org.freedesktop.DBus",
            );
        }
    }

    /**
     * Replaces all shortcuts with the given ones.
     *
     * @returns the ids that ended up with a key assigned
     */
    public async bind(shortcuts: PortalShortcut[]): Promise<PortalBindResult> {
        await this.connect();
        await this.closeSession();
        await this.removeStaleKdeShortcuts(new Set(shortcuts.map((s) => s.id)));
        if (shortcuts.length === 0) return new Set();

        if (!this.listening) {
            this.listening = true;
            this.bus!.connection.on("message", (msg: { interface?: string; member?: string; body?: unknown[] }) => {
                if (msg.interface !== SHORTCUTS_IFACE || msg.member !== "Activated") return;
                const [session, id] = msg.body as [string, string];
                if (session === this.sessionPath) this.onActivated(id);
            });
        }

        const session = await this.request(
            "CreateSession",
            (token) => [
                [
                    ["handle_token", ["s", token]],
                    ["session_handle_token", ["s", `session${this.counter}`]],
                ],
            ],
            "a{sv}",
        );
        this.sessionPath = dictGet(session, "session_handle") as string;

        const list = shortcuts.map((s): [string, Dict] => {
            const trigger = acceleratorToPortalTrigger(s.accelerator);
            const options: Dict = [["description", ["s", s.description]]];
            if (trigger) options.push(["preferred_trigger", ["s", trigger]]);
            return [s.id, options];
        });
        const bound = await this.request(
            "BindShortcuts",
            (token) => [this.sessionPath, list, "", [["handle_token", ["s", token]]]],
            "oa(sa{sv})sa{sv}",
        );

        const result = new Set<string>();
        for (const [id, options] of (dictGet(bound, "shortcuts") as Array<[string, Dict]>) ?? []) {
            if (dictGet(options, "trigger_description")) result.add(id);
        }
        return result;
    }

    /**
     * The portal has no way to forget a shortcut, and every key the user tries leaves one behind in KDE's
     * shortcut settings. KDE lets the app remove its own, so drop the ones we're no longer going to bind.
     * Does nothing on other desktops, where the KDE service isn't there.
     */
    private async removeStaleKdeShortcuts(keep: Set<string>): Promise<void> {
        const kde = "org.kde.kglobalaccel";
        try {
            const component = `/component/${this.appId.replace(/[^A-Za-z0-9]/g, "_")}`;
            const names: string[] = await this.invoke("shortcutNames", "", [], `${kde}.Component`, component, kde);
            for (const name of names) {
                if (keep.has(name)) continue;
                await this.invoke("unregister", "ss", [this.appId, name], "org.kde.KGlobalAccel", "/kglobalaccel", kde);
            }
        } catch (e) {
            console.debug("Not cleaning up old shortcuts", e);
        }
    }

    private async closeSession(): Promise<void> {
        const path = this.sessionPath;
        this.sessionPath = undefined;
        if (!path) return;
        try {
            await this.invoke("Close", "", [], "org.freedesktop.portal.Session", path);
        } catch {
            // The session may already be gone
        }
    }

    public async dispose(): Promise<void> {
        await this.closeSession();
        this.bus?.connection.end();
        this.bus = undefined;
        this.listening = false;
    }
}
