/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getGlobalShortcutStatus, registerGlobalShortcuts, setGlobalShortcutBindings } from "./global-shortcuts.js";

const { register, unregisterAll, storeData } = vi.hoisted(() => ({
    register: vi.fn<(accelerator: string, callback: () => void) => boolean>(() => true),
    unregisterAll: vi.fn(),
    storeData: { globalShortcuts: undefined as unknown },
}));

vi.mock("electron", () => ({ app: { getAppPath: () => "/nonexistent" }, globalShortcut: { register, unregisterAll } }));
vi.mock("./store.js", () => ({
    default: {
        instance: {
            get: (key: string) => (key === "globalShortcuts" ? storeData.globalShortcuts : undefined),
            set: (key: string, value: unknown) => {
                if (key === "globalShortcuts") storeData.globalShortcuts = value;
            },
        },
    },
}));

describe("global shortcuts", () => {
    const send = vi.fn();

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Keep these tests on Electron's own shortcuts, whatever session the tests run in
        vi.stubEnv("XDG_SESSION_TYPE", "x11");
        register.mockReturnValue(true);
        storeData.globalShortcuts = undefined;
        global.mainWindow = { webContents: { send } } as unknown as typeof global.mainWindow;
    });

    it("registers nothing when no shortcuts are bound", async () => {
        await registerGlobalShortcuts();
        expect(unregisterAll).toHaveBeenCalled();
        expect(register).not.toHaveBeenCalled();
    });

    it("tells the renderer which action was pressed", async () => {
        await setGlobalShortcutBindings({ toggleMicrophone: "Ctrl+Shift+M" });
        expect(register).toHaveBeenCalledWith("Ctrl+Shift+M", expect.any(Function));

        register.mock.calls[0][1]();
        expect(send).toHaveBeenCalledWith("globalShortcut", "toggleMicrophone");
    });

    it("drops unknown actions and empty accelerators", async () => {
        const status = await setGlobalShortcutBindings({
            toggleCamera: " F9 ",
            hangUp: "",
            bogus: "Ctrl+X",
            toggleMicrophone: 3,
        });
        expect(status.bindings).toEqual({ toggleCamera: "F9" });
        expect(register).toHaveBeenCalledTimes(1);
    });

    it("reports shortcuts the system refused or Electron could not parse", async () => {
        register.mockImplementation((accelerator) => {
            if (accelerator === "Nonsense") throw new Error("bad accelerator");
            return false;
        });
        const status = await setGlobalShortcutBindings({ toggleMicrophone: "Ctrl+M", hangUp: "Nonsense" });
        expect(status.registered).toEqual({ toggleMicrophone: false, hangUp: false });
    });

    it("flags Wayland as system-managed", () => {
        vi.stubEnv("XDG_SESSION_TYPE", "wayland");
        expect(getGlobalShortcutStatus().managedBySystem).toBe(process.platform === "linux");
    });
});
