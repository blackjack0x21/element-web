/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "test-utils-rtl";
import { EventType, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { stubClient } from "test-utils";

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { QuickReactionsRow } from "./QuickReactionsRow";
import * as recent from "../../../emojipicker/recentReactions";

vi.mock("../../../dispatcher/dispatcher");
vi.mock("../../../emojipicker/recentReactions");

describe("QuickReactionsRow", () => {
    const event = new MatrixEvent({ event_id: "$ev", room_id: "!room:server", type: EventType.RoomMessage });

    beforeEach(() => {
        stubClient();
        vi.mocked(recent.get).mockReturnValue(["👍", "🎉"]);
    });

    it("renders nothing without recent emoji", () => {
        vi.mocked(recent.get).mockReturnValue([]);
        const { container } = render(<QuickReactionsRow mxEvent={event} onFinished={vi.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("sends a reaction and records it as recent", () => {
        const onFinished = vi.fn();
        render(<QuickReactionsRow mxEvent={event} onFinished={onFinished} />);
        fireEvent.click(screen.getByRole("menuitem", { name: "🎉" }));

        expect(MatrixClientPeg.safeGet().sendEvent).toHaveBeenCalledWith("!room:server", EventType.Reaction, {
            "m.relates_to": { rel_type: "m.annotation", event_id: "$ev", key: "🎉" },
        });
        expect(recent.add).toHaveBeenCalledWith("🎉");
        expect(onFinished).toHaveBeenCalled();
    });
});
