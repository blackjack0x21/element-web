/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE in the repository root for full details.
 */

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TypedEventEmitter } from "matrix-js-sdk/src/matrix";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { UserPanelViewModel } from "./UserPanelViewModel";
import { CallStore, CallStoreEvent } from "../../stores/CallStore";
import { CallEvent, ElementCall } from "../../models/Call";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { type OwnProfileStore } from "../../stores/OwnProfileStore";
import { type MatrixDispatcher } from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";

class EventEmitter extends TypedEventEmitter<string, Record<string, () => void>> {}

type MockCall = ElementCall & { deviceMute: unknown };

function mkCall(): MockCall {
    // Only the ElementCall surface the view model touches; instanceof still holds
    const call = new EventEmitter() as unknown as MockCall;
    Object.setPrototypeOf(call, ElementCall.prototype);
    // The real ones are prototype getters, so plain assignment would throw
    Object.defineProperties(call, {
        roomId: { value: "!room:example.org" },
        deviceMute: {
            value: { audio_enabled: true, video_enabled: true, deafened: false },
            writable: true,
        },
    });
    Object.assign(call, {
        toggleMicrophone: vi.fn().mockResolvedValue(undefined),
        toggleDeafen: vi.fn().mockResolvedValue(undefined),
        toggleCamera: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
    });
    return call;
}

describe("UserPanelViewModel", () => {
    let client: MatrixClient;
    let ownProfileStore: OwnProfileStore & EventEmitter;
    let callStore: CallStore & EventEmitter;
    let hasCamera: () => Promise<boolean>;
    let dispatcher: { dispatch: ReturnType<typeof vi.fn> };

    const mkVm = (): UserPanelViewModel =>
        new UserPanelViewModel({
            client,
            ownProfileStore,
            callStore,
            hasCamera,
            dispatcher: dispatcher as unknown as MatrixDispatcher,
        });

    const connect = (call: ElementCall | null): void => {
        const prev = callStore.connectedCalls;
        (callStore as unknown as { connectedCalls: Set<unknown> }).connectedCalls = new Set(call ? [call] : []);
        callStore.emit(CallStoreEvent.ConnectedCalls, callStore.connectedCalls, prev);
    };

    beforeEach(() => {
        client = {
            getSafeUserId: () => "@me:example.org",
            getRoom: () => ({ name: "Design chat" }),
        } as unknown as MatrixClient;
        ownProfileStore = Object.assign(new EventEmitter(), {
            displayName: "Me",
            getHttpAvatarUrl: () => "http://avatar",
            userStatus: undefined,
        }) as unknown as OwnProfileStore & EventEmitter;
        callStore = Object.assign(new EventEmitter(), { connectedCalls: new Set() }) as unknown as CallStore &
            EventEmitter;
        dispatcher = { dispatch: vi.fn() };
        hasCamera = vi.fn().mockResolvedValue(true);
    });

    it("shows the profile and no call initially", () => {
        const vm = mkVm();
        expect(vm.getSnapshot()).toEqual({
            userId: "@me:example.org",
            displayName: "Me",
            avatarUrl: "http://avatar",
            userStatus: undefined,
            call: undefined,
        });
    });

    it("follows profile changes", () => {
        const vm = mkVm();
        Object.assign(ownProfileStore, { displayName: "New name" });
        ownProfileStore.emit(UPDATE_EVENT);
        expect(vm.getSnapshot().displayName).toBe("New name");
    });

    it("shows and clears the call as it connects and disconnects", () => {
        const vm = mkVm();
        connect(mkCall());
        expect(vm.getSnapshot().call).toEqual({
            roomName: "Design chat",
            microphoneMuted: false,
            deafened: false,
            cameraOn: true,
            cameraAvailable: true,
        });
        connect(null);
        expect(vm.getSnapshot().call).toBeUndefined();
    });

    it("tracks the mute state, treating deafen as muted", () => {
        const call = mkCall();
        connect(call);
        const vm = mkVm();

        const state = { audio_enabled: true, video_enabled: false, deafened: true };
        call.deviceMute = state;
        call.emit(CallEvent.DeviceMute, state);
        expect(vm.getSnapshot().call).toMatchObject({ microphoneMuted: true, deafened: true, cameraOn: false });
    });

    it("marks the camera as unavailable when the device has none", async () => {
        hasCamera = vi.fn().mockResolvedValue(false);
        connect(mkCall());
        const vm = mkVm();
        await vi.waitFor(() => expect(vm.getSnapshot().call?.cameraAvailable).toBe(false));
    });

    it("looks for a camera again when devices change", async () => {
        const mediaDevices = new EventTarget();
        vi.stubGlobal("navigator", { mediaDevices });
        hasCamera = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
        connect(mkCall());
        const vm = mkVm();
        await vi.waitFor(() => expect(hasCamera).toHaveBeenCalledTimes(1));
        expect(vm.getSnapshot().call?.cameraAvailable).toBe(true);

        mediaDevices.dispatchEvent(new Event("devicechange"));
        await vi.waitFor(() => expect(vm.getSnapshot().call?.cameraAvailable).toBe(false));

        vm.dispose();
        mediaDevices.dispatchEvent(new Event("devicechange"));
        expect(hasCamera).toHaveBeenCalledTimes(2);
        vi.unstubAllGlobals();
    });

    it("forwards the controls to the call", () => {
        const call = mkCall();
        connect(call);
        const vm = mkVm();

        vm.toggleMicrophone();
        vm.toggleDeafen();
        vm.toggleCamera();
        vm.hangUp();
        expect(call.toggleMicrophone).toHaveBeenCalled();
        expect(call.toggleDeafen).toHaveBeenCalled();
        expect(call.toggleCamera).toHaveBeenCalled();
        expect(call.disconnect).toHaveBeenCalled();
    });

    it("does nothing with the controls when there is no call", () => {
        const vm = mkVm();
        expect(() => vm.toggleMicrophone()).not.toThrow();
        vm.openCallRoom();
        expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it("opens the call room and the settings", () => {
        const call = mkCall();
        connect(call);
        const vm = mkVm();

        vm.openCallRoom();
        expect(dispatcher.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ action: Action.ViewRoom, room_id: "!room:example.org" }),
        );
        vm.openSettings();
        expect(dispatcher.dispatch).toHaveBeenCalledWith({ action: Action.ViewUserSettings });
    });

    it("stops listening when disposed", () => {
        const call = mkCall();
        connect(call);
        const vm = mkVm();
        vm.dispose();
        expect(call.listenerCount(CallEvent.DeviceMute)).toBe(0);
        expect(callStore.listenerCount(CallStoreEvent.ConnectedCalls)).toBe(0);
    });
});
