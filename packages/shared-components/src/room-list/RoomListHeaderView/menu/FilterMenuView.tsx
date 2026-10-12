/*
 * Copyright 2026 Kreesty
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, useState } from "react";
import { IconButton, Menu, RadioMenuItem } from "@vector-im/compound-web";
import FilterIcon from "@vector-im/compound-design-tokens/assets/web/icons/filter";
import classNames from "classnames";

import { type ViewModel, useViewModel } from "../../../core/viewmodel";
import { useI18n } from "../../../core/i18n/i18nContext";
import { filterIdToLabel, type FilterId } from "../../RoomListPrimaryFilters";
import styles from "./FilterMenuView.module.css";

/**
 * The part of the room list state the filter menu needs.
 */
export interface FilterMenuViewSnapshot {
    /** The filters the user can pick from */
    filterIds: FilterId[];
    /** The filter currently applied to the room list, if any */
    activeFilterId?: FilterId;
}

export interface FilterMenuViewActions {
    /** Apply the given filter, or remove it if it is already the active one */
    onToggleFilter: (filterId: FilterId) => void;
}

export type FilterMenuViewModel = ViewModel<FilterMenuViewSnapshot, FilterMenuViewActions>;

interface FilterMenuViewProps {
    /** The view model providing the available and active filters */
    vm: FilterMenuViewModel;
}

/**
 * A menu to filter the room list. While a filter is applied the button is highlighted
 * and shows a dot, so it is clear that some rooms are hidden.
 *
 * @example
 * ```tsx
 * <FilterMenuView vm={roomListViewModel} />
 * ```
 */
export function FilterMenuView({ vm }: Readonly<FilterMenuViewProps>): JSX.Element {
    const { translate: _t } = useI18n();
    const [open, setOpen] = useState(false);
    const { filterIds, activeFilterId } = useViewModel(vm);

    const label = activeFilterId
        ? _t("room_list|filter_menu|button_active", { filter: filterIdToLabel(activeFilterId) })
        : _t("room_list|filter_menu|button");

    return (
        <Menu
            open={open}
            onOpenChange={setOpen}
            title={_t("room_list|filter_menu|title")}
            showTitle={false}
            align="start"
            trigger={
                <IconButton
                    tooltip={label}
                    aria-label={label}
                    // 28px button with a 20px icon
                    size="28px"
                    style={{ padding: "4px" }}
                    className={classNames(styles.button, { [styles.active]: activeFilterId !== undefined })}
                    data-active={activeFilterId !== undefined}
                >
                    <FilterIcon aria-hidden />
                </IconButton>
            }
        >
            <RadioMenuItem
                label={_t("room_list|filter_menu|all")}
                checked={activeFilterId === undefined}
                onSelect={() => activeFilterId && vm.onToggleFilter(activeFilterId)}
            />
            {filterIds.map((id) => (
                <RadioMenuItem
                    key={id}
                    label={filterIdToLabel(id)}
                    checked={activeFilterId === id}
                    onSelect={() => vm.onToggleFilter(id)}
                />
            ))}
        </Menu>
    );
}
