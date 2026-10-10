/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import classNames from "classnames";
import React, { type JSX, useCallback, useEffect, useMemo, useRef } from "react";

import { FavouriteIcon, FavouriteSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { type KlipyGifResult, pickBestFormat } from "../../../gif/KlipyGifService";
import { _t } from "../../../languageHandler";
import { RovingAccessibleButton } from "../../../accessibility/RovingTabIndex";

/** Number of masonry columns - must match the CSS in _GifPicker.pcss */
export const GIF_COLUMNS = 2;

interface GifGridProps {
    results: KlipyGifResult[];
    onSelect: (gif: KlipyGifResult) => void;
    onLoadMore?: () => void;
    loading: boolean;
    /** Whether the GIF with this id is saved as a favourite. */
    isFavorite: (id: string) => boolean;
    onToggleFavorite: (gif: KlipyGifResult) => void;
    /** Text shown when there are no results. Defaults to the "no results" message. */
    emptyMessage?: string;
}

/**
 * A two column masonry of GIF thumbnails, each shown at its natural aspect ratio like Discord does.
 * Uses the pickBestFormat preview fallback chain for fast loading and supports infinite scroll via IntersectionObserver.
 */
export function GifGrid({
    results,
    onSelect,
    onLoadMore,
    loading,
    isFavorite,
    onToggleFavorite,
    emptyMessage,
}: GifGridProps): JSX.Element {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!onLoadMore || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !loading) {
                    onLoadMore();
                }
            },
            { rootMargin: "200px" },
        );

        const sentinel = sentinelRef.current;
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [onLoadMore, loading]);

    const handleClick = useCallback(
        (gif: KlipyGifResult) => (): void => {
            onSelect(gif);
        },
        [onSelect],
    );

    // Put each GIF in the currently shortest column. Placement only depends on the GIFs before it, so loading more
    // results never moves GIFs that are already on screen.
    const columns = useMemo(() => {
        const cols = Array.from({ length: GIF_COLUMNS }, (_, i) => ({
            key: `column-${i}`,
            gifs: [] as KlipyGifResult[],
        }));
        const heights: number[] = Array.from({ length: GIF_COLUMNS }, () => 0);
        for (const gif of results) {
            const { width, height } = pickBestFormat(gif).preview;
            const shortest = heights.indexOf(Math.min(...heights));
            cols[shortest].gifs.push(gif);
            heights[shortest] += height / width || 1;
        }
        return cols;
    }, [results]);

    if (results.length === 0 && !loading) {
        return (
            <div className="mx_GifPicker_empty">
                <span>{emptyMessage ?? _t("composer|gif_no_results")}</span>
            </div>
        );
    }

    return (
        <>
            <div className="mx_GifPicker_grid" role="group" aria-label={_t("composer|gif_grid_label")}>
                {columns.map((column) => (
                    <div key={column.key} className="mx_GifPicker_column">
                        {column.gifs.map((gif) => {
                            const preview = pickBestFormat(gif).preview;
                            const favorite = isFavorite(gif.id);
                            return (
                                <div className="mx_GifPicker_cell" key={gif.id}>
                                    <RovingAccessibleButton
                                        className="mx_GifPicker_gridItem"
                                        data-gif-id={gif.id}
                                        onClick={handleClick(gif)}
                                        title={gif.content_description}
                                        aria-label={gif.content_description || _t("composer|gif_item")}
                                    >
                                        <img
                                            src={preview.url}
                                            alt=""
                                            loading="lazy"
                                            width={preview.width}
                                            height={preview.height}
                                        />
                                    </RovingAccessibleButton>
                                    {/* Not in the roving tab order: keyboard users press "f" on the GIF instead */}
                                    <button
                                        type="button"
                                        className={classNames("mx_GifPicker_favoriteButton", {
                                            mx_GifPicker_favoriteButton_active: favorite,
                                        })}
                                        tabIndex={-1}
                                        aria-pressed={favorite}
                                        aria-label={
                                            favorite
                                                ? _t("composer|gif_remove_favorite")
                                                : _t("composer|gif_add_favorite")
                                        }
                                        title={
                                            favorite
                                                ? _t("composer|gif_remove_favorite")
                                                : _t("composer|gif_add_favorite")
                                        }
                                        onClick={() => onToggleFavorite(gif)}
                                    >
                                        {favorite ? <FavouriteSolidIcon /> : <FavouriteIcon />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            {onLoadMore && <div ref={sentinelRef} className="mx_GifPicker_sentinel" />}
        </>
    );
}
