/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "test-utils-rtl";

import { SoundVolumeSettings } from "./SoundVolumeSettings";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";

describe("<SoundVolumeSettings />", () => {
    afterEach(async () => {
        for (const setting of [
            "notificationSoundVolume",
            "ringtoneVolume",
            "callSoundsVolume",
            "audioPlaybackVolume",
            "videoPlaybackVolume",
        ] as const) {
            await SettingsStore.setValue(setting, null, SettingLevel.DEVICE, null);
        }
        vi.restoreAllMocks();
    });

    it("renders a slider for each sound", () => {
        render(<SoundVolumeSettings />);

        for (const name of ["Notifications", "Ringtone", "Call sounds", "Voice messages and audio files", "Videos"]) {
            expect(screen.getByRole("slider", { name })).toHaveValue("100");
        }
    });

    it("shows the stored volume", async () => {
        await SettingsStore.setValue("ringtoneVolume", null, SettingLevel.DEVICE, 0.4);

        render(<SoundVolumeSettings />);

        expect(screen.getByRole("slider", { name: "Ringtone" })).toHaveValue("40");
    });

    it("stores the volume when a slider is moved", () => {
        const setValueSpy = vi.spyOn(SettingsStore, "setValue");
        render(<SoundVolumeSettings />);

        fireEvent.change(screen.getByRole("slider", { name: "Notifications" }), { target: { value: "25" } });

        expect(setValueSpy).toHaveBeenCalledWith("notificationSoundVolume", null, SettingLevel.DEVICE, 0.25);
    });

    it("updates when the volume is changed elsewhere", async () => {
        render(<SoundVolumeSettings />);

        await SettingsStore.setValue("videoPlaybackVolume", null, SettingLevel.DEVICE, 0.6);

        await waitFor(() => expect(screen.getByRole("slider", { name: "Videos" })).toHaveValue("60"));
    });
});
