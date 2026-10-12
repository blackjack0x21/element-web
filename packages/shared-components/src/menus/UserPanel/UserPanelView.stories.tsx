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
import { useMockedViewModel } from "../../core/viewmodel";
import { withViewDocs } from "../../../.storybook/withViewDocs";

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
