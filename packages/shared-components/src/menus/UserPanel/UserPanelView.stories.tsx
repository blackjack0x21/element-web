/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE in the repository root for full details.
 */

import { type Meta, type StoryObj } from "@storybook/react-vite";
import React, { type JSX } from "react";
import { fn } from "storybook/test";

import { UserPanelView, type UserPanelViewActions, type UserPanelViewSnapshot } from "./UserPanelView";
import { MockViewModel, useMockedViewModel } from "../../core/viewmodel";
import { type UserMenuViewActions, type UserMenuViewSnapshot } from "../UserMenu/UserMenu";
import { type SetStatusViewSnapshot } from "../../status/SetStatusView";
import { withViewDocs } from "../../../.storybook/withViewDocs";

class MockSetStatusViewModel extends MockViewModel<SetStatusViewSnapshot> {
    public setStatus = fn();
    public clearStatus = fn();
}

class MockUserMenuViewModel extends MockViewModel<UserMenuViewSnapshot> implements UserMenuViewActions {
    public setOpen = fn();
    public createAccount = fn();
    public signIn = fn();
    public openHomePage = fn();
    public linkNewDevice = fn();
    public openSecurity = fn();
    public openFeedback = fn();
    public openSettings = fn();
    public clearStatus = fn();
}

const userMenuViewModel = new MockUserMenuViewModel({
    open: false,
    expanded: true,
    displayName: "Sally Sanderson",
    userId: "@sally:homeserver.com",
    setStatusViewModel: new MockSetStatusViewModel({ userStatus: undefined } as SetStatusViewSnapshot),
    actions: { linkNewDevice: true, openSecurity: true, openFeedback: true, openSettings: true },
});

const UserPanelWrapperImpl = (snapshot: UserPanelViewSnapshot): JSX.Element => {
    const vm = useMockedViewModel<UserPanelViewSnapshot, UserPanelViewActions>(snapshot, {
        toggleMicrophone: fn(),
        toggleDeafen: fn(),
        toggleCamera: fn(),
        hangUp: fn(),
        openCallRoom: fn(),
        openSettings: fn(),
    });
    return (
        <div style={{ width: 240 }}>
            <UserPanelView vm={vm} />
        </div>
    );
};

const UserPanelWrapper = withViewDocs(UserPanelWrapperImpl, UserPanelView);

const meta = {
    title: "Menus/UserPanel",
    component: UserPanelWrapper,
    tags: ["autodocs"],
    args: {
        displayName: "Sally Sanderson",
        userId: "@sally:homeserver.com",
        userMenuViewModel,
    },
} satisfies Meta<typeof UserPanelWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithStatus: Story = {
    args: { userStatus: { emoji: "🌴", text: "On holiday" } },
};

export const InCall: Story = {
    args: {
        call: {
            roomName: "Design chat",
            microphoneMuted: false,
            deafened: false,
            cameraOn: false,
            cameraAvailable: true,
        },
    },
};

export const Muted: Story = {
    args: {
        call: {
            roomName: "Design chat",
            microphoneMuted: true,
            deafened: false,
            cameraOn: true,
            cameraAvailable: true,
        },
    },
};

export const Deafened: Story = {
    args: {
        call: {
            roomName: "A room with a very long name that has to be cut off",
            microphoneMuted: true,
            deafened: true,
            cameraOn: false,
        },
    },
};

export const NoCamera: Story = {
    args: {
        call: {
            roomName: "Design chat",
            microphoneMuted: false,
            deafened: false,
            cameraOn: false,
            cameraAvailable: false,
        },
    },
};
