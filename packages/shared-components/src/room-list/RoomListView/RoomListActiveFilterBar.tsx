/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";

import { Flex } from "../../core/utils/Flex";
import { useI18n } from "../../core/i18n/i18nContext";
import { filterIdToLabel, type FilterId } from "../RoomListPrimaryFilters";
import styles from "./RoomListActiveFilterBar.module.css";

interface RoomListActiveFilterBarProps {
    /** The filter applied to the room list */
    filterId: FilterId;
    /** Remove the filter */
    onClear: () => void;
}

/**
 * A bar above the room list telling the user that a filter is applied, with a way to remove it.
 */
export function RoomListActiveFilterBar({ filterId, onClear }: Readonly<RoomListActiveFilterBarProps>): JSX.Element {
    const { translate: _t } = useI18n();

    return (
        <Flex
            className={styles.bar}
            role="status"
            align="center"
            justify="space-between"
            gap="var(--cpd-space-2x)"
            data-testid="room-list-active-filter"
        >
            <span className={styles.text}>
                {_t("room_list|filter_menu|showing_only", { filter: filterIdToLabel(filterId) })}
            </span>
            <button type="button" className={styles.clear} onClick={onClear}>
                {_t("room_list|filter_menu|clear")}
            </button>
        </Flex>
    );
}
