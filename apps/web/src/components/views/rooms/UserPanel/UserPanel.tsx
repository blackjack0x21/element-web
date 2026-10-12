/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import React, { type JSX, useLayoutEffect, useRef } from "react";
import { UserPanelView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { OwnProfileStore } from "../../../../stores/OwnProfileStore";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { UserPanelViewModel } from "../../../../viewmodels/menus/UserPanelViewModel";

/** Space left around the floating panel, in px. */
const GAP = 8;

/**
 * Keeps the overlay across the bottom of the space panel and the room list, whatever their widths are, and
 * publishes the room it covers as `--mx-user-panel-inset` so the panels above can pad their content.
 */
function useFloatingLayout(overlay: React.RefObject<HTMLDivElement | null>): void {
    useLayoutEffect(() => {
        const el = overlay.current;
        const container = el?.parentElement;
        if (!el || !container) return;

        const update = (): void => {
            const spaces = container.querySelector(".mx_SpacePanel");
            const rooms = container.querySelector(".mx_LeftPanel_outerWrapper");
            const origin = container.getBoundingClientRect();
            const left = spaces?.getBoundingClientRect().left ?? rooms?.getBoundingClientRect().left;
            const right = rooms?.getBoundingClientRect().right;
            if (left === undefined || right === undefined) return;
            el.style.setProperty("left", `${left - origin.left + GAP}px`);
            el.style.setProperty("width", `${right - left - 2 * GAP}px`);
            container.style.setProperty("--mx-user-panel-inset", `${el.offsetHeight + 2 * GAP}px`);
        };

        const observer = new ResizeObserver(update);
        observer.observe(container);
        observer.observe(el.firstElementChild ?? el);
        for (const selector of [".mx_SpacePanel", ".mx_LeftPanel_outerWrapper"]) {
            const target = container.querySelector(selector);
            if (target) observer.observe(target);
        }
        update();
        return () => {
            observer.disconnect();
            container.style.removeProperty("--mx-user-panel-inset");
        };
    }, [overlay]);
}

/**
 * The profile and call controls, floating over the bottom of the space panel and the room list.
 */
export function UserPanel(): JSX.Element {
    const client = useMatrixClientContext();
    const vm = useCreateAutoDisposedViewModel(
        () =>
            new UserPanelViewModel({
                client,
                ownProfileStore: OwnProfileStore.instance,
                dispatcher: defaultDispatcher,
            }),
    );

    const overlay = useRef<HTMLDivElement>(null);
    useFloatingLayout(overlay);

    return (
        <div ref={overlay} className="mx_UserPanelOverlay">
            <UserPanelView vm={vm} />
        </div>
    );
}
