/*
Copyright (c) 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FC } from "react";
import { ChevronLeftIcon, EndCallIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { IconButton } from "@vector-im/compound-web";

import styles from "./WidgetPipView.module.css";
import { useViewModel, type ViewModel } from "../../core/viewmodel";
import { useI18n } from "../..";

export interface WidgetPipViewActions {
    /**
     * Call this once the back button is clicked in the pip view.
     * The view model will handle navigating back to the associated room.
     * @param ev The mouse event that triggered the back click.
     */
    onBackClick: (ev: React.MouseEvent) => void;
    /**
     * The view model exposes the `<PersistentApp />` component via this action.
     * `PersistentApp` is not available in shared components.
     * It can be any React component that renders a widget.
     * It will be mounted inside the PipView.
     */
    persistentAppComponent: React.FC<{
        persistentWidgetId: string;
        persistentRoomId: string;
        /**
         * Drawn over the widget, inside the same container as the widget itself. The widget is not part of the
         * pip's own DOM (so that it survives the pip going away) and is always drawn above it, so anything
         * that is meant to be seen or clicked over the widget has to be passed in here.
         */
        children?: React.ReactNode;
    }>;
    /**
     * Action that needs to be called when the pip view starts to get dragged.
     * @param ev The mouse event that triggered the drag start.
     */
    onStartMoving: (ev: React.MouseEvent) => void;
    /**
     * Call this to leave the call the widget shows. Only used when the snapshot's `canLeave` is true.
     */
    onLeave: () => void;
}

export interface WidgetPipViewSnapshot {
    /**
     * The widget ID this view is rendering.
     */
    widgetId: string;
    /**
     * The room name the Pip View should use in the header.
     */
    roomName: string;
    /**
     * The room ID this PiP view’s widget is associated with.
     */
    roomId: string;
    /**
     * Whether the widget is a call that can be left from the pip, which shows a leave button.
     */
    canLeave: boolean;
}

/**
 * The view model for the widget PiP view.
 */
export type WidgetPipViewModel = ViewModel<WidgetPipViewSnapshot> & WidgetPipViewActions;

export interface WidgetPipViewProps {
    /**
     * The WidgetPipViewModel to expose the WidgetPipViewSnapshot and to:
     *  - handling the back button callback.
     *  - exposing the persistentApp react component to the view.
     */
    vm: WidgetPipViewModel;
}

/**
 * A picture-in-picture view for a widget. The widget fills the whole window; the room name (which takes the
 * user back to the room) and, for a call, a leave button float over it on hover. Dragging anywhere else moves
 * the window around.
 */
export const WidgetPipView: FC<WidgetPipViewProps> = ({ vm }) => {
    const snapshot = useViewModel(vm);
    const { translate: _t } = useI18n();
    const back = _t("action|back");
    const leave = _t("user_panel|hang_up");

    // This is rendered by the widget's own container, outside of the pip: events do not reach the pip from
    // here, so dragging and double clicking are wired up explicitly, and no hooks may be used in it (it does
    // not get this view's contexts either, hence the strings are looked up above).
    const overlay = (
        <div className={styles.overlay} onMouseDown={vm.onStartMoving} onDoubleClick={(ev) => vm.onBackClick(ev)}>
            <button
                type="button"
                className={styles.back}
                data-testid="base-card-back-button"
                aria-label={back}
                onMouseDown={(ev) => ev.stopPropagation()}
                onDoubleClick={(ev) => ev.stopPropagation()}
                onClick={(ev) => vm.onBackClick(ev)}
            >
                <ChevronLeftIcon className={styles.backIcon} />
                <span className={styles.name}>{snapshot.roomName}</span>
            </button>
            {snapshot.canLeave && (
                <IconButton
                    className={styles.leave}
                    size="32px"
                    kind="primary"
                    destructive
                    tooltip={leave}
                    aria-label={leave}
                    onMouseDown={(ev) => ev.stopPropagation()}
                    onDoubleClick={(ev) => ev.stopPropagation()}
                    onClick={vm.onLeave}
                >
                    <EndCallIcon />
                </IconButton>
            )}
        </div>
    );

    return (
        <div data-testid="widget-pip-container" className={styles.container}>
            <vm.persistentAppComponent persistentWidgetId={snapshot.widgetId} persistentRoomId={snapshot.roomId}>
                {overlay}
            </vm.persistentAppComponent>
        </div>
    );
};
