/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";
import { render, screen } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { MoreOptionContent, RoomListItemMoreOptionsMenu } from "./RoomListItemMoreOptionsMenu";
import { RoomNotifState } from "./RoomNotifs";
import { useMockedViewModel } from "../../../../core/viewmodel";
import type { RoomListItemViewSnapshot } from "./RoomListItemView";
import { defaultSnapshot } from "./default-snapshot";
import { mockedActions as mockCallbacks } from "./mocked-actions";

describe("<RoomListItemNotificationMenu />", () => {
    const renderMenu = (
        roomNotifState: RoomNotifState = RoomNotifState.AllMessages,
        showNotificationMenu = true,
    ): ReturnType<typeof render> => {
        const TestComponent = (): JSX.Element => {
            const vm = useMockedViewModel(
                {
                    ...defaultSnapshot,
                    showMoreOptionsMenu: true,
                    showNotificationMenu,
                    roomNotifState,
                } as RoomListItemViewSnapshot,
                mockCallbacks,
            );
            return <RoomListItemMoreOptionsMenu vm={vm} />;
        };
        return render(<TestComponent />);
    };

    // Radix submenus don't open reliably in the test env, so render the menu content directly
    const renderContent = (roomNotifState: RoomNotifState): ReturnType<typeof render> => {
        const TestComponent = (): JSX.Element => {
            const vm = useMockedViewModel(
                { ...defaultSnapshot, showNotificationMenu: true, roomNotifState } as RoomListItemViewSnapshot,
                mockCallbacks,
            );
            return <MoreOptionContent vm={vm} />;
        };
        return render(<TestComponent />);
    };

    /** Opens the options menu, then the notification options submenu */
    const openSubMenu = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
        await user.click(screen.getByRole("button", { name: "More Options" }));
        await user.click(screen.getByRole("menuitem", { name: "Notification options" }));
        await screen.findByRole("menuitem", { name: "Match default settings" });
    };

    it("should not show the notification options when showNotificationMenu is false", async () => {
        const user = userEvent.setup();
        renderMenu(RoomNotifState.AllMessages, false);

        await user.click(screen.getByRole("button", { name: "More Options" }));

        expect(screen.queryByRole("menuitem", { name: "Notification options" })).not.toBeInTheDocument();
    });

    it("should not render a separate notification button", () => {
        renderMenu();
        expect(screen.queryByRole("button", { name: "Notification options" })).not.toBeInTheDocument();
    });

    it("should show the notification options submenu in the options menu", async () => {
        const user = userEvent.setup();
        renderMenu();

        await openSubMenu(user);

        expect(screen.getByRole("menuitem", { name: "Match default settings" })).toBeInTheDocument();
    });

    it.each([
        ["Match default settings", RoomNotifState.AllMessages],
        ["All messages", RoomNotifState.AllMessagesLoud],
        ["Mentions and keywords", RoomNotifState.MentionsOnly],
        ["Mute room", RoomNotifState.Mute],
    ])("should call onSetRoomNotifState when %s is selected", async (name, state) => {
        const user = userEvent.setup();
        // Start from a different state so the selection is a real change
        renderContent(state === RoomNotifState.Mute ? RoomNotifState.AllMessages : RoomNotifState.Mute);

        await user.click(screen.getByRole("menuitem", { name }));

        expect(mockCallbacks.onSetRoomNotifState).toHaveBeenCalledWith(state);
    });

    it.each([
        ["Match default settings", RoomNotifState.AllMessages],
        ["All messages", RoomNotifState.AllMessagesLoud],
        ["Mentions and keywords", RoomNotifState.MentionsOnly],
        ["Mute room", RoomNotifState.Mute],
    ])("should mark %s as selected when it is the current state", (name, state) => {
        renderContent(state);

        expect(screen.getByRole("menuitem", { name })).toHaveAttribute("aria-selected", "true");
    });
});
