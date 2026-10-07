/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@test-utils";
import React from "react";
import { describe, it, expect, vi } from "vitest";

import * as stories from "./VolumeSlider.stories.tsx";
import { VolumeSlider } from "./VolumeSlider";

const { Default, Muted } = composeStories(stories);

describe("VolumeSlider", () => {
    it("renders the slider", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders the muted state", () => {
        const { container } = render(<Muted />);
        expect(container).toMatchSnapshot();
    });

    it("shows the volume as a percentage", () => {
        render(<VolumeSlider volume={0.3} onVolumeChange={vi.fn()} />);
        const slider = screen.getByRole("slider", { name: "Volume" });
        expect(slider).toHaveValue("30");
        expect(slider).toHaveAttribute("aria-valuetext", "30%");
    });

    it("calls onVolumeChange with a value between 0 and 1", () => {
        const onVolumeChange = vi.fn();
        render(<VolumeSlider volume={0.5} onVolumeChange={onVolumeChange} />);
        fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "20" } });
        expect(onVolumeChange).toHaveBeenCalledWith(0.2);
    });

    it("does not let key presses on the slider reach its parent", () => {
        const onParentKeyDown = vi.fn();
        render(
            <div onKeyDown={onParentKeyDown}>
                <VolumeSlider volume={0.5} onVolumeChange={vi.fn()} />
            </div>,
        );
        fireEvent.keyDown(screen.getByRole("slider", { name: "Volume" }), { key: "ArrowLeft" });
        expect(onParentKeyDown).not.toHaveBeenCalled();
    });
});
