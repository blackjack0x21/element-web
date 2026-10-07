/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { Text } from "@vector-im/compound-web";
import { VolumeSlider } from "@element-hq/web-shared-components";

import { _t, _td } from "../../../languageHandler";
import { useSettingValue } from "../../../hooks/useSettings";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";

/** The device-level settings holding a volume, between 0 and 1. */
type VolumeSettingKey =
    | "notificationSoundVolume"
    | "ringtoneVolume"
    | "callSoundsVolume"
    | "audioPlaybackVolume"
    | "videoPlaybackVolume";

/** The volume settings shown here, with the label for each. */
const VOLUME_SETTINGS: Array<[VolumeSettingKey, TranslationKey]> = [
    ["notificationSoundVolume", _td("settings|sounds|notifications")],
    ["ringtoneVolume", _td("settings|sounds|ringtone")],
    ["callSoundsVolume", _td("settings|sounds|call_sounds")],
    ["audioPlaybackVolume", _td("settings|sounds|audio_playback")],
    ["videoPlaybackVolume", _td("settings|sounds|video_playback")],
];

interface SoundVolumeSettingProps {
    /** The setting holding the volume. */
    setting: VolumeSettingKey;
    /** The label shown next to the slider. */
    label: string;
}

/**
 * A labelled slider that changes the volume stored in a setting.
 */
function SoundVolumeSetting({ setting, label }: Readonly<SoundVolumeSettingProps>): JSX.Element {
    const volume = useSettingValue(setting);

    return (
        <div className="mx_SoundVolumeSetting">
            <Text as="span" size="md" weight="medium">
                {label}
            </Text>
            <VolumeSlider
                className="mx_SoundVolumeSetting_slider"
                volume={volume}
                label={label}
                onVolumeChange={(newVolume) => SettingsStore.setValue(setting, null, SettingLevel.DEVICE, newVolume)}
            />
        </div>
    );
}

/**
 * Sliders for the volume of the sounds the app plays: notifications, call sounds and media in the timeline.
 */
export function SoundVolumeSettings(): JSX.Element {
    return (
        <div className="mx_SoundVolumeSettings">
            {VOLUME_SETTINGS.map(([setting, label]) => (
                <SoundVolumeSetting key={setting} setting={setting} label={_t(label)} />
            ))}
        </div>
    );
}
