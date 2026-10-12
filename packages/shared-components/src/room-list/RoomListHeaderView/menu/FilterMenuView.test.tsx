/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { render, screen } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { FilterMenuView, type FilterMenuViewActions, type FilterMenuViewSnapshot } from "./FilterMenuView";
import { MockViewModel } from "../../../core/viewmodel";
import { type FilterId } from "../../RoomListPrimaryFilters";

class MockedFilterViewModel extends MockViewModel<FilterMenuViewSnapshot> implements FilterMenuViewActions {
    public onToggleFilter = vi.fn<(filterId: FilterId) => void>();
}

function createVm(activeFilterId?: FilterId): MockedFilterViewModel {
    return new MockedFilterViewModel({ filterIds: ["unread", "people", "rooms"], activeFilterId });
}

describe("<FilterMenuView />", () => {
    it("does not flag the button when no filter is applied", () => {
        render(<FilterMenuView vm={createVm()} />);
        const button = screen.getByRole("button", { name: "Filter rooms" });
        expect(button).toHaveAttribute("data-active", "false");
    });

    it("flags the button and names the filter when one is applied", () => {
        render(<FilterMenuView vm={createVm("people")} />);
        const button = screen.getByRole("button", { name: "Filter rooms (People applied)" });
        expect(button).toHaveAttribute("data-active", "true");
    });

    it("checks the applied filter and toggles filters on select", async () => {
        const user = userEvent.setup();
        const vm = createVm("people");
        render(<FilterMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: /Filter rooms/ }));
        expect(screen.getByRole("menuitemradio", { name: "People" })).toBeChecked();
        expect(screen.getByRole("menuitemradio", { name: "All chats" })).not.toBeChecked();

        await user.click(screen.getByRole("menuitemradio", { name: "Unread" }));
        expect(vm.onToggleFilter).toHaveBeenCalledWith("unread");
    });

    it("clears the applied filter when All chats is selected", async () => {
        const user = userEvent.setup();
        const vm = createVm("rooms");
        render(<FilterMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: /Filter rooms/ }));
        await user.click(screen.getByRole("menuitemradio", { name: "All chats" }));
        expect(vm.onToggleFilter).toHaveBeenCalledWith("rooms");
    });
});
