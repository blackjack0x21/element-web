/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { useArgs } from "storybook/preview-api";

import { VolumeSlider } from "./VolumeSlider";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
    title: "Audio/VolumeSlider",
    component: VolumeSlider,
    tags: ["autodocs"],
    argTypes: {
        volume: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
        },
    },
    args: {
        volume: 0.5,
        onVolumeChange: () => {},
    },
    render: function Render(args) {
        const [, updateArgs] = useArgs();
        return <VolumeSlider {...args} onVolumeChange={(volume) => updateArgs({ volume })} />;
    },
} satisfies Meta<typeof VolumeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Muted: Story = {
    args: {
        volume: 0,
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
    },
};
