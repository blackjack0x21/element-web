/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE in the repository root for full details.
 */

import {
    BaseViewModel,
    type UserPanelViewActions,
    type UserPanelViewSnapshot,
} from "@element-hq/web-shared-components";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { type OwnProfileStore } from "../../stores/OwnProfileStore";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { CallStore, CallStoreEvent } from "../../stores/CallStore";
import { CallEvent, ElementCall } from "../../models/Call";
import type { MatrixDispatcher } from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type ActionPayload } from "../../dispatcher/payloads";
import { UserMenuViewModel } from "./UserMenuViewModel";
import MediaDeviceHandler, { MediaDeviceKindEnum } from "../../MediaDeviceHandler";

interface UserPanelViewModelProps {
    client: MatrixClient;
    ownProfileStore: OwnProfileStore;
    dispatcher: MatrixDispatcher;
    callStore?: CallStore;
    /** Whether the device has a camera. Defaults to asking the browser. */
    hasCamera?: () => Promise<boolean>;
}

async function browserHasCamera(): Promise<boolean> {
    const devices = await MediaDeviceHandler.getDevices();
    return (devices?.[MediaDeviceKindEnum.VideoInput].length ?? 0) > 0;
}

/**
 * Drives the user panel at the bottom of the left sidebar: the user's profile and the controls of the
 * Element Call they are connected to, if any.
 */
export class UserPanelViewModel
    extends BaseViewModel<UserPanelViewSnapshot, UserPanelViewModelProps>
    implements UserPanelViewActions
{
    private readonly callStore: CallStore;
    /** The call whose controls are shown, together with the listeners attached to it. */
    private call: ElementCall | null = null;
    private cameraAvailable = true;
    private readonly userMenu: UserMenuViewModel;

    public constructor(props: UserPanelViewModelProps) {
        const callStore = props.callStore ?? CallStore.instance;
        // The profile area opens the same menu the space panel used to have
        const userMenu = new UserMenuViewModel(
            { ownProfileStore: props.ownProfileStore },
            props.dispatcher,
            props.client,
            false,
        );
        super(props, UserPanelViewModel.computeSnapshot(props, userMenu, UserPanelViewModel.findCall(callStore)));
        this.callStore = callStore;
        this.userMenu = userMenu;
        this.disposables.track(() => userMenu.dispose());

        const dispatcherRef = props.dispatcher.register(this.onAction);
        this.disposables.track(() => props.dispatcher.unregister(dispatcherRef));

        this.disposables.trackListener(props.ownProfileStore, UPDATE_EVENT, this.onProfileChanged);
        this.disposables.trackListener(this.callStore, CallStoreEvent.ConnectedCalls, this.onConnectedCalls);
        this.disposables.track(() => this.watchCall(null));
        this.watchCall(UserPanelViewModel.findCall(callStore));

        // Plugging in or removing a camera changes whether the camera button can be used
        const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
        mediaDevices?.addEventListener?.("devicechange", this.refreshCamera);
        this.disposables.track(() => mediaDevices?.removeEventListener?.("devicechange", this.refreshCamera));
        this.refreshCamera();
    }

    private readonly refreshCamera = (): void => {
        (this.props.hasCamera ?? browserHasCamera)().then(
            (available) => {
                if (this.isDisposed || available === this.cameraAvailable) return;
                this.cameraAvailable = available;
                this.onDeviceMute();
            },
            (e) => logger.warn("User panel: failed to look for a camera", e),
        );
    };

    private static findCall(callStore: CallStore): ElementCall | null {
        for (const call of callStore.connectedCalls) {
            if (call instanceof ElementCall) return call;
        }
        return null;
    }

    private static computeSnapshot(
        props: UserPanelViewModelProps,
        userMenuViewModel: UserMenuViewModel,
        call: ElementCall | null,
    ): UserPanelViewSnapshot {
        const { client, ownProfileStore } = props;
        const userId = client.getSafeUserId();
        return {
            userId,
            displayName: ownProfileStore.displayName || userId,
            avatarUrl: ownProfileStore.getHttpAvatarUrl(64) ?? undefined,
            userStatus: ownProfileStore.userStatus,
            userMenuViewModel,
            call: call ? UserPanelViewModel.computeCall(client, call, true) : undefined,
        };
    }

    private static computeCall(
        client: MatrixClient,
        call: ElementCall,
        cameraAvailable: boolean,
    ): UserPanelViewSnapshot["call"] {
        const { audio_enabled, video_enabled, deafened } = call.deviceMute;
        return {
            roomName: client.getRoom(call.roomId)?.name ?? call.roomId,
            // Deafening takes the microphone with it
            microphoneMuted: !audio_enabled || deafened === true,
            deafened: deafened === true,
            cameraOn: video_enabled,
            cameraAvailable,
        };
    }

    /** Moves the call listeners over to `call`. */
    private watchCall(call: ElementCall | null): void {
        if (this.call === call) return;
        this.call?.off(CallEvent.DeviceMute, this.onDeviceMute);
        this.call = call;
        this.call?.on(CallEvent.DeviceMute, this.onDeviceMute);
    }

    /** The keyboard shortcut for the user menu opens the menu from here. */
    private readonly onAction = (payload: ActionPayload): void => {
        if (payload.action === Action.ToggleUserMenu) {
            this.userMenu.setOpen(!this.userMenu.getSnapshot().open);
        }
    };

    private readonly onProfileChanged = (): void => {
        const { client, ownProfileStore } = this.props;
        const userId = client.getSafeUserId();
        this.snapshot.merge({
            displayName: ownProfileStore.displayName || userId,
            avatarUrl: ownProfileStore.getHttpAvatarUrl(64) ?? undefined,
            userStatus: ownProfileStore.userStatus,
        });
    };

    private readonly onConnectedCalls = (): void => {
        const call = UserPanelViewModel.findCall(this.callStore);
        this.watchCall(call);
        this.snapshot.merge({
            call: call ? UserPanelViewModel.computeCall(this.props.client, call, this.cameraAvailable) : undefined,
        });
    };

    private readonly onDeviceMute = (): void => {
        if (!this.call) return;
        this.snapshot.merge({
            call: UserPanelViewModel.computeCall(this.props.client, this.call, this.cameraAvailable),
        });
    };

    private runOnCall(name: string, action: (call: ElementCall) => Promise<void>): void {
        if (!this.call) return;
        action(this.call).catch((e) => logger.warn(`User panel: failed to ${name}`, e));
    }

    public readonly toggleMicrophone = (): void => this.runOnCall("toggle the microphone", (c) => c.toggleMicrophone());

    public readonly toggleDeafen = (): void => this.runOnCall("toggle deafen", (c) => c.toggleDeafen());

    public readonly toggleCamera = (): void => this.runOnCall("toggle the camera", (c) => c.toggleCamera());

    public readonly hangUp = (): void => this.runOnCall("hang up", (c) => c.disconnect());

    public readonly openCallRoom = (): void => {
        if (!this.call) return;
        this.props.dispatcher.dispatch({
            action: Action.ViewRoom,
            room_id: this.call.roomId,
            metricsTrigger: "UserPanel",
        });
    };

    public readonly openSettings = (): void => {
        this.props.dispatcher.dispatch({ action: Action.ViewUserSettings });
    };
}
