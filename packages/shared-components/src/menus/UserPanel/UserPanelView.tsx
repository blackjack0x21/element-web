/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE in the repository root for full details.
 */

import React, { type JSX } from "react";
import { Avatar, IconButton, Text, Tooltip } from "@vector-im/compound-web";
import {
    EndCallIcon,
    HeadphonesOffSolidIcon,
    HeadphonesSolidIcon,
    MicOffSolidIcon,
    MicOnSolidIcon,
    SettingsSolidIcon,
    VideoCallOffSolidIcon,
    VideoCallSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import classNames from "classnames";

import styles from "./UserPanelView.module.css";
import { useViewModel, type ViewModel } from "../../core/viewmodel";
import { useI18n } from "../../core/i18n/i18nContext";
import { type UserStatus } from "../../core/userStatus";

/** The call the user is connected to. */
export interface UserPanelCallSnapshot {
    /** Name of the room the call is in. */
    roomName: string;
    /** Whether the microphone is muted (deafening also mutes it). */
    microphoneMuted: boolean;
    /** Whether the user is deafened, i.e. cannot hear the call. */
    deafened: boolean;
    /** Whether the camera is on. */
    cameraOn: boolean;
}

export interface UserPanelViewSnapshot {
    /** Matrix user ID. */
    userId: string;
    /** Display name, falling back to the user ID. */
    displayName: string;
    /** Avatar URL, if one is set. */
    avatarUrl?: string;
    /** The user's custom status, if they have one. */
    userStatus?: UserStatus;
    /** The connected call, or undefined when the user is not in a call. */
    call?: UserPanelCallSnapshot;
}

export interface UserPanelViewActions {
    /** Mute or unmute the microphone in the call. */
    toggleMicrophone: () => void;
    /** Deafen or undeafen the user in the call. */
    toggleDeafen: () => void;
    /** Turn the camera in the call on or off. */
    toggleCamera: () => void;
    /** Leave the call. */
    hangUp: () => void;
    /** Show the room of the call. */
    openCallRoom: () => void;
    /** Open the settings dialog. */
    openSettings: () => void;
}

export type UserPanelViewModel = ViewModel<UserPanelViewSnapshot, UserPanelViewActions>;

export interface UserPanelViewProps {
    vm: UserPanelViewModel;
    /** Class name for the wrapper. */
    className?: string;
}

interface PanelButtonProps {
    label: string;
    onClick: () => void;
    /** Highlights the button, used for the muted / deafened states. */
    active?: boolean;
    children: JSX.Element;
}

function PanelButton({ label, onClick, active, children }: PanelButtonProps): JSX.Element {
    return (
        <Tooltip label={label}>
            <IconButton
                className={classNames(styles.button, { [styles.active]: active })}
                aria-label={label}
                aria-pressed={active}
                onClick={onClick}
                size="28px"
            >
                {children}
            </IconButton>
        </Tooltip>
    );
}

/**
 * The panel at the bottom of the left sidebar: who you are, your call controls and a shortcut to the settings.
 */
export function UserPanelView({ vm, className }: UserPanelViewProps): JSX.Element {
    const { userId, displayName, avatarUrl, userStatus, call } = useViewModel(vm);
    const { translate: _t } = useI18n();

    return (
        <section className={classNames(styles.panel, className)} aria-label={_t("user_panel|title")}>
            {call && (
                <div className={styles.call} data-testid="user-panel-call">
                    <div className={styles.callInfo}>
                        <button type="button" className={styles.callRoom} onClick={vm.openCallRoom}>
                            <Text as="span" size="sm" weight="semibold" className={styles.callStatus}>
                                {_t("user_panel|call_connected")}
                            </Text>
                            <Text as="span" size="sm" className={styles.ellipsis}>
                                {call.roomName}
                            </Text>
                        </button>
                        <PanelButton
                            label={call.cameraOn ? _t("user_panel|turn_camera_off") : _t("user_panel|turn_camera_on")}
                            onClick={vm.toggleCamera}
                            active={!call.cameraOn}
                        >
                            {call.cameraOn ? <VideoCallSolidIcon /> : <VideoCallOffSolidIcon />}
                        </PanelButton>
                        <PanelButton label={_t("user_panel|hang_up")} onClick={vm.hangUp}>
                            <EndCallIcon />
                        </PanelButton>
                    </div>
                </div>
            )}
            <div className={styles.user}>
                <button
                    type="button"
                    className={styles.profile}
                    onClick={vm.openSettings}
                    title={_t("user_panel|open_settings")}
                >
                    <Avatar id={userId} name={displayName} type="round" size="32px" src={avatarUrl} />
                    <span className={styles.names}>
                        <Text as="span" size="md" weight="semibold" className={styles.ellipsis}>
                            {displayName}
                        </Text>
                        <Text as="span" size="sm" className={classNames(styles.ellipsis, styles.secondary)}>
                            {userStatus ? `${userStatus.emoji} ${userStatus.text}` : userId}
                        </Text>
                    </span>
                </button>
                {call && (
                    <>
                        <PanelButton
                            label={call.microphoneMuted ? _t("user_panel|unmute") : _t("user_panel|mute")}
                            onClick={vm.toggleMicrophone}
                            active={call.microphoneMuted}
                        >
                            {call.microphoneMuted ? <MicOffSolidIcon /> : <MicOnSolidIcon />}
                        </PanelButton>
                        <PanelButton
                            label={call.deafened ? _t("user_panel|undeafen") : _t("user_panel|deafen")}
                            onClick={vm.toggleDeafen}
                            active={call.deafened}
                        >
                            {call.deafened ? <HeadphonesOffSolidIcon /> : <HeadphonesSolidIcon />}
                        </PanelButton>
                    </>
                )}
                <PanelButton label={_t("user_panel|open_settings")} onClick={vm.openSettings}>
                    <SettingsSolidIcon />
                </PanelButton>
            </div>
        </section>
    );
}
