/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE in the repository root for full details.
 */

import React from "react";
import { render, screen } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { UserPanelView, type UserPanelViewActions, type UserPanelViewSnapshot } from "./UserPanelView";
import { MockViewModel } from "../../core/viewmodel";

class MockUserPanelViewModel extends MockViewModel<UserPanelViewSnapshot> implements UserPanelViewActions {
    public toggleMicrophone = vi.fn();
    public toggleDeafen = vi.fn();
    public toggleCamera = vi.fn();
    public hangUp = vi.fn();
    public openCallRoom = vi.fn();
    public openSettings = vi.fn();
}

const base: UserPanelViewSnapshot = { userId: "@sally:example.org", displayName: "Sally" };
const call = { roomName: "Design chat", microphoneMuted: false, deafened: false, cameraOn: true };

describe("UserPanelView", () => {
    it("shows only the profile and settings when not in a call", async () => {
        const vm = new MockUserPanelViewModel(base);
        render(<UserPanelView vm={vm} />);

        expect(screen.getByText("Sally")).toBeInTheDocument();
        expect(screen.getByText("@sally:example.org")).toBeInTheDocument();
        expect(screen.queryByTestId("user-panel-call")).toBeNull();
        expect(screen.queryByRole("button", { name: "Mute" })).toBeNull();

        await userEvent.click(screen.getAllByRole("button", { name: "User settings" })[0]);
        expect(vm.openSettings).toHaveBeenCalled();
    });

    it("shows the custom status instead of the user ID", () => {
        render(
            <UserPanelView vm={new MockUserPanelViewModel({ ...base, userStatus: { emoji: "🌴", text: "Away" } })} />,
        );
        expect(screen.getByText("🌴 Away")).toBeInTheDocument();
    });

    it("shows the call controls and calls the actions", async () => {
        const vm = new MockUserPanelViewModel({ ...base, call });
        render(<UserPanelView vm={vm} />);

        expect(screen.getByText("Design chat")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Mute" }));
        await userEvent.click(screen.getByRole("button", { name: "Deafen" }));
        await userEvent.click(screen.getByRole("button", { name: "Turn camera off" }));
        await userEvent.click(screen.getByRole("button", { name: "Leave call" }));
        await userEvent.click(screen.getByText("Design chat"));

        expect(vm.toggleMicrophone).toHaveBeenCalled();
        expect(vm.toggleDeafen).toHaveBeenCalled();
        expect(vm.toggleCamera).toHaveBeenCalled();
        expect(vm.hangUp).toHaveBeenCalled();
        expect(vm.openCallRoom).toHaveBeenCalled();
    });

    it("offers the opposite action when muted, deafened and the camera is off", () => {
        const vm = new MockUserPanelViewModel({
            ...base,
            call: { ...call, microphoneMuted: true, deafened: true, cameraOn: false },
        });
        render(<UserPanelView vm={vm} />);

        expect(screen.getByRole("button", { name: "Unmute" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Undeafen" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Turn camera on" })).toBeInTheDocument();
    });
});
