/*
 * Copyright (c) 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { render } from "@test-utils";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { describe, it, vi, expect } from "vitest";
import { getByTestId } from "storybook/test";

import * as stories from "./WidgetPipView.stories.tsx";

const { Default } = composeStories(stories);

describe("WidgetPipView", () => {
    it("renders", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });
    it("detects back click action", async () => {
        const onBackClick = vi.fn();
        const { container, getByRole } = render(<Default onBackClick={onBackClick} />);
        expect(container).toMatchSnapshot();

        const button = getByRole("button", { name: "Back" });
        await userEvent.click(button);
        expect(onBackClick).toHaveBeenCalled();
    });
    it("detects on mouse down for drag", async () => {
        const onStartMoving = vi.fn();
        const { container } = render(<Default onStartMoving={onStartMoving} />);

        const pipContainer = getByTestId(container, "widget-pip-container");
        await userEvent.pointer({ keys: "[MouseLeft>]", target: pipContainer.querySelector("[class*=overlay]")! });
        expect(onStartMoving).toHaveBeenCalled();
    });
    it("goes back on double click, but not twice from the back button", async () => {
        const onBackClick = vi.fn();
        const { container, getByRole } = render(<Default onBackClick={onBackClick} />);

        await userEvent.dblClick(container.querySelector("[class*=overlay]")!);
        expect(onBackClick).toHaveBeenCalledTimes(1);

        onBackClick.mockClear();
        await userEvent.dblClick(getByRole("button", { name: "Back" }));
        // Once for each click, none for the double click itself
        expect(onBackClick).toHaveBeenCalledTimes(2);
    });
    it("does not start a drag from the buttons", async () => {
        const onStartMoving = vi.fn();
        const { getByRole } = render(<Default onStartMoving={onStartMoving} />);

        await userEvent.click(getByRole("button", { name: "Back" }));
        await userEvent.click(getByRole("button", { name: "Leave call" }));
        expect(onStartMoving).not.toHaveBeenCalled();
    });
    it("leaves the call", async () => {
        const onLeave = vi.fn();
        const { getByRole } = render(<Default onLeave={onLeave} />);
        await userEvent.click(getByRole("button", { name: "Leave call" }));
        expect(onLeave).toHaveBeenCalled();
    });
    it("has no leave button for a widget that is not a call", () => {
        const { queryByRole } = render(<Default canLeave={false} />);
        expect(queryByRole("button", { name: "Leave call" })).toBeNull();
    });
});
