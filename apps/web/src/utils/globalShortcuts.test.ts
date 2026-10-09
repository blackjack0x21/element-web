/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleGlobalShortcut, isGlobalShortcutAction } from "./globalShortcuts";
import { CallStore } from "../stores/CallStore";
import { ElementCall } from "../models/Call";

// The real modules pull in most of the app; only the identity of the classes matters here
vi.mock("../models/Call", () => ({ ElementCall: class ElementCall {} }));
vi.mock("../stores/CallStore", () => ({ CallStore: { instance: undefined } }));

function mockCall(): ElementCall {
    const call = new (ElementCall as unknown as new () => ElementCall)();
    call.toggleMicrophone = vi.fn(async () => {});
    call.toggleCamera = vi.fn(async () => {});
    call.toggleDeafen = vi.fn(async () => {});
    call.disconnect = vi.fn(async () => {});
    return call;
}

describe("globalShortcuts", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("recognises only known actions", () => {
        expect(isGlobalShortcutAction("toggleMicrophone")).toBe(true);
        expect(isGlobalShortcutAction("rm -rf")).toBe(false);
        expect(isGlobalShortcutAction(undefined)).toBe(false);
    });

    it("applies each action to the connected Element Call", async () => {
        const call = mockCall();
        vi.spyOn(CallStore, "instance", "get").mockReturnValue({
            connectedCalls: new Set([call]),
        } as unknown as CallStore);

        await handleGlobalShortcut("toggleMicrophone");
        await handleGlobalShortcut("toggleCamera");
        await handleGlobalShortcut("toggleDeafen");
        await handleGlobalShortcut("hangUp");

        expect(call.toggleMicrophone).toHaveBeenCalledTimes(1);
        expect(call.toggleCamera).toHaveBeenCalledTimes(1);
        expect(call.toggleDeafen).toHaveBeenCalledTimes(1);
        expect(call.disconnect).toHaveBeenCalledTimes(1);
    });

    it("does nothing without a call, and survives a failing one", async () => {
        const spy = vi
            .spyOn(CallStore, "instance", "get")
            .mockReturnValue({ connectedCalls: new Set() } as unknown as CallStore);
        await expect(handleGlobalShortcut("toggleMicrophone")).resolves.toBeUndefined();

        const call = mockCall();
        call.toggleMicrophone = vi.fn().mockRejectedValue(new Error("boom"));
        spy.mockReturnValue({ connectedCalls: new Set([call]) } as unknown as CallStore);
        await expect(handleGlobalShortcut("toggleMicrophone")).resolves.toBeUndefined();
    });
});
