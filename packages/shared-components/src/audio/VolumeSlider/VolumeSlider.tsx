/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type ChangeEvent, type JSX } from "react";
import classNames from "classnames";
import VolumeOnIcon from "@vector-im/compound-design-tokens/assets/web/icons/volume-on";
import VolumeOffIcon from "@vector-im/compound-design-tokens/assets/web/icons/volume-off";

import styles from "./VolumeSlider.module.css";
import { SeekBar } from "../SeekBar";
import { useI18n } from "../../core/i18n/i18nContext";

export interface VolumeSliderProps {
    /**
     * The current volume, between 0 and 1.
     */
    volume: number;
    /**
     * Called with the new volume, between 0 and 1, when the user moves the slider.
     */
    onVolumeChange: (volume: number) => void;
    /**
     * Whether the slider is disabled.
     * @default false
     */
    disabled?: boolean;
    /**
     * Optional class name for the container.
     */
    className?: string;
}

/**
 * A compact volume slider for audio playback, with an icon showing whether the audio is muted.
 *
 * @example
 * ```tsx
 * <VolumeSlider volume={0.5} onVolumeChange={(volume) => console.log("New volume", volume)} />
 * ```
 */
export function VolumeSlider({
    volume,
    onVolumeChange,
    disabled,
    className,
}: Readonly<VolumeSliderProps>): JSX.Element {
    const { translate: _t } = useI18n();
    const Icon = volume === 0 ? VolumeOffIcon : VolumeOnIcon;
    const percent = Math.round(volume * 100);

    return (
        <div className={classNames(styles.volumeSlider, className)}>
            <Icon className={styles.icon} width="16px" height="16px" aria-hidden />
            <SeekBar
                className={styles.slider}
                value={percent}
                disabled={disabled}
                aria-label={_t("a11y|volume_slider_label")}
                aria-valuetext={`${percent}%`}
                onChange={(ev: ChangeEvent<HTMLInputElement>) => onVolumeChange(Number(ev.target.value) / 100)}
                // Audio players handle arrow keys themselves to seek, so keep them from seeing
                // the keys used to move this slider.
                onKeyDown={(ev) => ev.stopPropagation()}
            />
        </div>
    );
}
