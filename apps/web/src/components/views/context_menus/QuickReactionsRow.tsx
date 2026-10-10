/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import React, { type JSX, useContext } from "react";
import { EventType, RelationType, type MatrixEvent, type Relations } from "matrix-js-sdk/src/matrix";

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import RoomContext from "../../../contexts/RoomContext";
import { MenuItem } from "../../../accessibility/context_menu/MenuItem";
import * as recent from "../../../emojipicker/recentReactions";

/** Number of emoji shown in the row. */
export const QUICK_REACTION_COUNT = 4;

interface Props {
    mxEvent: MatrixEvent;
    reactions?: Relations | null;
    onFinished: () => void;
}

/**
 * A row of the user's most used emoji, shown in the message context menu.
 * Choosing one sends that reaction, or removes it if the user already reacted with it.
 */
export function QuickReactionsRow({ mxEvent, reactions, onFinished }: Props): JSX.Element | null {
    const { canSelfRedact, timelineRenderingType } = useContext(RoomContext);
    const emojis = recent.get(QUICK_REACTION_COUNT);
    if (emojis.length === 0) return null;

    const cli = MatrixClientPeg.safeGet();
    const myReactions = new Map<string, string>();
    for (const event of reactions?.getAnnotationsBySender()?.[cli.getSafeUserId()] ?? []) {
        const key = event.getRelation()?.key;
        if (!event.isRedacted() && key) myReactions.set(key, event.getId()!);
    }

    const onChoose = (emoji: string): void => {
        const roomId = mxEvent.getRoomId()!;
        const existing = myReactions.get(emoji);
        if (existing) {
            // Without redaction permission the user can't undo their own reaction.
            if (!canSelfRedact) return;
            void cli.redactEvent(roomId, existing);
        } else {
            void cli.sendEvent(roomId, EventType.Reaction, {
                "m.relates_to": {
                    rel_type: RelationType.Annotation,
                    event_id: mxEvent.getId()!,
                    key: emoji,
                },
            });
            dis.dispatch({ action: "message_sent" });
            recent.add(emoji);
        }
        dis.dispatch({ action: Action.FocusAComposer, context: timelineRenderingType });
        onFinished();
    };

    return (
        <div className="mx_QuickReactionsRow" role="group">
            {emojis.map((emoji) => (
                <MenuItem
                    key={emoji}
                    className="mx_QuickReactionsRow_emoji"
                    label={emoji}
                    aria-pressed={myReactions.has(emoji)}
                    onClick={() => onChoose(emoji)}
                >
                    {emoji}
                </MenuItem>
            ))}
        </div>
    );
}
