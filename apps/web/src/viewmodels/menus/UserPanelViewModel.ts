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

interface UserPanelViewModelProps {
    client: MatrixClient;
    ownProfileStore: OwnProfileStore;
    dispatcher: MatrixDispatcher;
    callStore?: CallStore;
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

    public constructor(props: UserPanelViewModelProps) {
        const callStore = props.callStore ?? CallStore.instance;
        super(props, UserPanelViewModel.computeSnapshot(props, UserPanelViewModel.findCall(callStore)));
        this.callStore = callStore;

        this.disposables.trackListener(props.ownProfileStore, UPDATE_EVENT, this.onProfileChanged);
        this.disposables.trackListener(this.callStore, CallStoreEvent.ConnectedCalls, this.onConnectedCalls);
        this.disposables.track(() => this.watchCall(null));
        this.watchCall(UserPanelViewModel.findCall(callStore));
    }

    private static findCall(callStore: CallStore): ElementCall | null {
        for (const call of callStore.connectedCalls) {
            if (call instanceof ElementCall) return call;
        }
        return null;
    }

    private static computeSnapshot(props: UserPanelViewModelProps, call: ElementCall | null): UserPanelViewSnapshot {
        const { client, ownProfileStore } = props;
        const userId = client.getSafeUserId();
        return {
            userId,
            displayName: ownProfileStore.displayName || userId,
            avatarUrl: ownProfileStore.getHttpAvatarUrl(64) ?? undefined,
            userStatus: ownProfileStore.userStatus,
            call: call ? UserPanelViewModel.computeCall(client, call) : undefined,
        };
    }

    private static computeCall(client: MatrixClient, call: ElementCall): UserPanelViewSnapshot["call"] {
        const { audio_enabled, video_enabled, deafened } = call.deviceMute;
        return {
            roomName: client.getRoom(call.roomId)?.name ?? call.roomId,
            // Deafening takes the microphone with it
            microphoneMuted: !audio_enabled || deafened === true,
            deafened: deafened === true,
            cameraOn: video_enabled,
        };
    }

    /** Moves the call listeners over to `call`. */
    private watchCall(call: ElementCall | null): void {
        if (this.call === call) return;
        this.call?.off(CallEvent.DeviceMute, this.onDeviceMute);
        this.call = call;
        this.call?.on(CallEvent.DeviceMute, this.onDeviceMute);
    }

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
        this.snapshot.merge({ call: call ? UserPanelViewModel.computeCall(this.props.client, call) : undefined });
    };

    private readonly onDeviceMute = (): void => {
        if (!this.call) return;
        this.snapshot.merge({ call: UserPanelViewModel.computeCall(this.props.client, this.call) });
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
