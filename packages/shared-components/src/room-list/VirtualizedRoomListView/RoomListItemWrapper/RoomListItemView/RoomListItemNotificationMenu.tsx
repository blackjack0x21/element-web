/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";
import { MenuItem, SubMenu } from "@vector-im/compound-web";
import {
    NotificationsSolidIcon,
    NotificationsOffSolidIcon,
    CheckIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../../core/i18n/i18n";
import { RoomNotifState } from "./RoomNotifs";
import { useHoverSubMenu } from "./useHoverSubMenu";
import { useViewModel, type ViewModel } from "../../../../core/viewmodel";
import type { RoomListItemViewSnapshot, RoomListItemViewActions } from "./RoomListItemView";

/**
 * View model type for room list item
 */
export type RoomListItemViewModel = ViewModel<RoomListItemViewSnapshot, RoomListItemViewActions>;

/**
 * Props for RoomListItemNotificationMenu component
 */
export interface RoomListItemNotificationMenuProps {
    /** The room item view model */
    vm: RoomListItemViewModel;
}

/**
 * The notification settings submenu for room list items.
 * Rendered inside the room options menu; displays options to change notification settings.
 */
export function RoomListItemNotificationMenu({ vm }: RoomListItemNotificationMenuProps): JSX.Element {
    const snapshot = useViewModel(vm);
    const { open, onOpenChange, handlers } = useHoverSubMenu();
    const isMuted = snapshot.roomNotifState === RoomNotifState.Mute;
    const checkComponent = <CheckIcon width="24px" height="24px" color="var(--cpd-color-icon-primary)" />;

    const options = [
        { state: RoomNotifState.AllMessages, label: _t("notifications|default_settings") },
        { state: RoomNotifState.AllMessagesLoud, label: _t("notifications|all_messages") },
        { state: RoomNotifState.MentionsOnly, label: _t("notifications|mentions_keywords") },
        { state: RoomNotifState.Mute, label: _t("notifications|mute_room") },
    ];

    return (
        <SubMenu
            open={open}
            onOpenChange={onOpenChange}
            trigger={
                <MenuItem
                    Icon={isMuted ? NotificationsOffSolidIcon : NotificationsSolidIcon}
                    label={_t("room_list|notification_options")}
                    onSelect={null}
                    {...handlers}
                />
            }
        >
            <div {...handlers}>
                {options.map(({ state, label }) => (
                    <MenuItem
                        key={state}
                        aria-selected={snapshot.roomNotifState === state}
                        hideChevron={true}
                        label={label}
                        onSelect={() => vm.onSetRoomNotifState(state)}
                        onClick={(evt) => evt.stopPropagation()}
                    >
                        {snapshot.roomNotifState === state && checkComponent}
                    </MenuItem>
                ))}
            </div>
        </SubMenu>
    );
}
