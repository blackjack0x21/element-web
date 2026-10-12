/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import React, { type JSX } from "react";
import { UserPanelView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { OwnProfileStore } from "../../../../stores/OwnProfileStore";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { UserPanelViewModel } from "../../../../viewmodels/menus/UserPanelViewModel";

/**
 * The profile and call controls shown at the bottom of the left sidebar.
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

    return <UserPanelView vm={vm} />;
}
