/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type Dispatch, type JSX, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type IContent, type IEventRelation, EventType, THREAD_RELATION_TYPE } from "matrix-js-sdk/src/matrix";
import { type StickerEventContent } from "matrix-js-sdk/src/types";
import { logger } from "matrix-js-sdk/src/logger";
import { InlineSpinner } from "@vector-im/compound-web";
import { type IAction as RovingAction } from "@element-hq/web-shared-components";

import { _t } from "../../../languageHandler";
import { KlipyGifService, pickBestFormat, type KlipyGifResult } from "../../../gif/KlipyGifService";
import { uploadFile } from "../../../ContentMessages";
import dis from "../../../dispatcher/dispatcher";
import { attachRelation } from "../../../utils/messages";
import { addReplyToMessageContent } from "../../../utils/Reply";
import { getFavorites, toggleFavorite } from "../../../gif/favorites";
import { useSettingValue } from "../../../hooks/useSettings";
import { GifSearch } from "./GifSearch";
import { GifGrid } from "./GifGrid";
import { useScopedRoomContext } from "../../../contexts/ScopedRoomContext.tsx";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import {
    type IState as RovingState,
    RovingStateActionType,
    RovingTabIndexProvider,
} from "../../../accessibility/RovingTabIndex";
import { Key } from "../../../Keyboard";

interface GifPickerProps {
    relation?: IEventRelation;
    onFinished: () => void;
}

/**
 * A Discord-style GIF search picker that shows trending GIFs by default and
 * allows searching via the Klipy API. Selecting a GIF downloads it and
 * uploads it to the homeserver as an m.sticker event.
 */
export function GifPicker({ relation, onFinished }: GifPickerProps): JSX.Element {
    const matrixClient = useContext(MatrixClientContext);
    const { room, replyToEvent, timelineRenderingType } = useScopedRoomContext(
        "room",
        "replyToEvent",
        "timelineRenderingType",
    );
    const roomId = room!.roomId;
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<KlipyGifResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [tab, setTab] = useState<"trending" | "favorites">("trending");
    // Read through the setting hook so the grid updates when favourites change (including from another device)
    const favorites = useSettingValue("gif_favorites");
    const favoriteIds = useMemo(() => new Set(favorites.map((gif) => gif.id)), [favorites]);
    const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);
    const showFavorites = tab === "favorites" && query.trim() === "";

    const resultsRef = useRef<KlipyGifResult[]>([]);
    resultsRef.current = results;
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const service = KlipyGifService.sharedInstance();

    // Fetch trending GIFs on mount
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        service
            .featured(20)
            .then((response) => {
                if (!cancelled) {
                    setResults(response.results);
                    setNextCursor(response.next);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    logger.error("Failed to fetch trending GIFs:", err);
                    setError(_t("composer|gif_error"));
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [service]);

    // Debounced search
    const handleQueryChange = useCallback(
        (newQuery: string): void => {
            setQuery(newQuery);
            // Searching always searches Klipy, so leave the favourites tab
            if (newQuery.trim() !== "") setTab("trending");

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            if (abortRef.current) {
                abortRef.current.abort();
            }

            if (newQuery.trim() === "") {
                // Reset to trending
                setLoading(true);
                setError(null);
                service
                    .featured(20)
                    .then((response) => {
                        setResults(response.results);
                        setNextCursor(response.next);
                        setLoading(false);
                    })
                    .catch((err) => {
                        logger.error("Failed to fetch trending GIFs:", err);
                        setError(_t("composer|gif_error"));
                        setLoading(false);
                    });
                return;
            }

            debounceRef.current = setTimeout(() => {
                const controller = new AbortController();
                abortRef.current = controller;

                setLoading(true);
                setError(null);

                service
                    .search(newQuery.trim(), 20)
                    .then((response) => {
                        if (!controller.signal.aborted) {
                            setResults(response.results);
                            setNextCursor(response.next);
                            setLoading(false);
                        }
                    })
                    .catch((err) => {
                        if (!controller.signal.aborted) {
                            logger.error("Failed to search GIFs:", err);
                            setError(_t("composer|gif_error"));
                            setLoading(false);
                        }
                    });
            }, 300);
        },
        [service],
    );

    // Load more results for infinite scroll
    const handleLoadMore = useCallback((): void => {
        if (!nextCursor || loading) return;

        setLoading(true);

        const fetchFn =
            query.trim() === "" ? service.featured(20, nextCursor) : service.search(query.trim(), 20, nextCursor);

        fetchFn
            .then((response) => {
                setResults((prev) => [...prev, ...response.results]);
                setNextCursor(response.next);
                setLoading(false);
            })
            .catch((err) => {
                logger.error("Failed to load more GIFs:", err);
                setLoading(false);
            });
    }, [nextCursor, loading, query, service]);

    // Handle GIF selection: pick best format, fetch, upload to homeserver, and send as m.sticker
    const handleSelect = useCallback(
        async (gif: KlipyGifResult): Promise<void> => {
            onFinished();

            try {
                const bestFormats = pickBestFormat(gif);
                const fullFormat = bestFormats.full;

                // Fetch the GIF bytes from the Klipy CDN
                const response = await fetch(fullFormat.url);
                const blob = await response.blob();

                // Upload to the Matrix homeserver (handles E2EE automatically)
                const uploadResult = await uploadFile(matrixClient, roomId, blob);

                // Build m.sticker event content with custom GIF metadata
                const content: IContent = {
                    "body": gif.content_description || "GIF",
                    "url": uploadResult.url,
                    "io.element.gif": true,
                    "info": {
                        "w": fullFormat.width,
                        "h": fullFormat.height,
                        "mimetype": fullFormat.mimeType,
                        "size": fullFormat.size,
                        "io.element.animated": true,
                    },
                };

                // For E2EE rooms, uploadFile returns a `file` instead of `url`
                if (uploadResult.file) {
                    content.file = uploadResult.file;
                    content.url = uploadResult.file.url;
                }

                // Attach thread/reply relations
                attachRelation(content, relation);
                if (replyToEvent) {
                    addReplyToMessageContent(content, replyToEvent);
                }

                // Derive threadId from relation for the sendEvent call
                const threadId = relation?.rel_type === THREAD_RELATION_TYPE.name ? (relation.event_id ?? null) : null;

                // Content includes custom io.element.* fields beyond the base StickerEventContent type
                await matrixClient.sendEvent(roomId, threadId, EventType.Sticker, content as StickerEventContent);

                if (replyToEvent) {
                    // Clear reply_to_event as we put the message into the queue
                    // if the send fails, retry will handle resending.
                    dis.dispatch({
                        action: "reply_to_event",
                        event: null,
                        context: timelineRenderingType,
                    });
                }
            } catch (err) {
                logger.error("Failed to send GIF:", err);
            }
        },
        [roomId, matrixClient, relation, replyToEvent, onFinished, timelineRenderingType],
    );

    // Track whether keyboard navigation has been activated (first arrow key press)
    const [keyboardActive, setKeyboardActive] = useState(false);

    // Keyboard navigation for grid - handles arrow keys to move between GIF items
    const handleKeyDown = useCallback(
        (ev: React.KeyboardEvent, state: RovingState, dispatch: Dispatch<RovingAction>): void => {
            // "f" on a focused GIF toggles it as a favourite (the star button is mouse-only)
            if (ev.key.toLowerCase() === "f" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
                const id = state.activeNode?.dataset.gifId;
                const gif = id ? [...resultsRef.current, ...getFavorites()].find((g) => g.id === id) : undefined;
                if (gif && ev.target === state.activeNode) {
                    toggleFavorite(gif);
                    ev.preventDefault();
                    ev.stopPropagation();
                }
                return;
            }

            if (![Key.ARROW_DOWN, Key.ARROW_RIGHT, Key.ARROW_LEFT, Key.ARROW_UP].includes(ev.key)) return;

            // On first arrow key press, focus the first GIF item
            if (!keyboardActive) {
                setKeyboardActive(true);
                if (state.nodes.length > 0) {
                    const firstNode = state.nodes[0];
                    firstNode?.focus();
                    firstNode?.scrollIntoView({
                        behavior: "auto",
                        block: "nearest",
                    });
                    dispatch({
                        type: RovingStateActionType.SetFocus,
                        payload: { node: firstNode },
                    });
                }
                ev.preventDefault();
                ev.stopPropagation();
                return;
            }

            if (!state.activeNode) return;

            // The columns have different heights, so pick the neighbour by on-screen position: for left/right the
            // nearest GIF in the next column over, for up/down the nearest GIF above/below in the same column.
            const from = state.activeNode.getBoundingClientRect();
            const fromX = from.left + from.width / 2;
            const fromY = from.top + from.height / 2;
            let focusNode: HTMLElement | undefined;
            let best = Infinity;
            for (const node of state.nodes) {
                if (node === state.activeNode) continue;
                const rect = node.getBoundingClientRect();
                const dx = rect.left + rect.width / 2 - fromX;
                const dy = rect.top + rect.height / 2 - fromY;
                const sameColumn = Math.abs(dx) < from.width / 2;
                let distance: number;
                switch (ev.key) {
                    case Key.ARROW_LEFT:
                        if (dx >= 0 || sameColumn) continue;
                        distance = Math.abs(dx) * 1000 + Math.abs(dy);
                        break;
                    case Key.ARROW_RIGHT:
                        if (dx <= 0 || sameColumn) continue;
                        distance = Math.abs(dx) * 1000 + Math.abs(dy);
                        break;
                    case Key.ARROW_UP:
                        if (dy >= 0 || !sameColumn) continue;
                        distance = -dy;
                        break;
                    default:
                        if (dy <= 0 || !sameColumn) continue;
                        distance = dy;
                }
                if (distance < best) {
                    best = distance;
                    focusNode = node;
                }
            }

            if (focusNode) {
                focusNode.focus();
                dispatch({
                    type: RovingStateActionType.SetFocus,
                    payload: { node: focusNode },
                });

                focusNode.scrollIntoView({
                    behavior: "auto",
                    block: "nearest",
                });

                ev.preventDefault();
                ev.stopPropagation();
            }
        },
        [keyboardActive],
    );

    return (
        <RovingTabIndexProvider onKeyDown={handleKeyDown}>
            {({ onKeyDownHandler }) => (
                <div className="mx_GifPicker" onKeyDown={onKeyDownHandler}>
                    <GifSearch query={query} onChange={handleQueryChange} />
                    <div className="mx_GifPicker_tabs" role="tablist">
                        {(["trending", "favorites"] as const).map((id) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                className="mx_GifPicker_tab"
                                aria-selected={tab === id}
                                onClick={() => {
                                    setTab(id);
                                    // Leaving a search to look at favourites (or back) clears the query
                                    if (query !== "") handleQueryChange("");
                                }}
                            >
                                {id === "trending" ? _t("composer|gif_tab_trending") : _t("composer|gif_tab_favorites")}
                            </button>
                        ))}
                    </div>
                    <div className="mx_GifPicker_header">
                        <span>
                            {query.trim() !== ""
                                ? query
                                : showFavorites
                                  ? _t("composer|gif_tab_favorites")
                                  : _t("composer|gif_trending")}
                        </span>
                    </div>
                    <div className="mx_GifPicker_body">
                        {error ? (
                            <div className="mx_GifPicker_error">
                                <span>{error}</span>
                            </div>
                        ) : (
                            <GifGrid
                                results={showFavorites ? favorites : results}
                                onSelect={handleSelect}
                                onLoadMore={showFavorites ? undefined : handleLoadMore}
                                loading={showFavorites ? false : loading}
                                isFavorite={isFavorite}
                                onToggleFavorite={toggleFavorite}
                                emptyMessage={showFavorites ? _t("composer|gif_no_favorites") : undefined}
                            />
                        )}
                        {loading && !showFavorites && (
                            <div className="mx_GifPicker_loading">
                                <InlineSpinner />
                            </div>
                        )}
                    </div>
                    <div className="mx_GifPicker_footer">
                        <span>{_t("composer|gif_powered_by_klipy")}</span>
                    </div>
                </div>
            )}
        </RovingTabIndexProvider>
    );
}
