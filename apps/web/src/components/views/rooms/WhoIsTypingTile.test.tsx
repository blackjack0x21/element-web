/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "test-utils-rtl";
import { type Room, type RoomMember, RoomMemberEvent } from "matrix-js-sdk/src/matrix";
import { EventEmitter } from "node:events";

import WhoIsTypingTile from "./WhoIsTypingTile";
import * as WhoIsTyping from "../../../WhoIsTyping";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import SettingsStore from "../../../settings/SettingsStore";

describe("WhoIsTypingTile", () => {
    const room = { roomId: "!room:example.org", getMember: vi.fn() } as unknown as Room;
    const bob = { userId: "@bob:example.org", name: "Bob" } as RoomMember;
    let client: EventEmitter;
    let showTypingNotifications: boolean;

    beforeEach(() => {
        client = new EventEmitter();
        showTypingNotifications = true;
        vi.spyOn(MatrixClientPeg, "safeGet").mockReturnValue(client as never);
        vi.spyOn(MatrixClientPeg, "get").mockReturnValue(client as never);
        vi.spyOn(SettingsStore, "getValue").mockImplementation(() => showTypingNotifications);
        vi.spyOn(SettingsStore, "watchSetting").mockReturnValue("watcher");
        vi.spyOn(SettingsStore, "unwatchSetting").mockReturnValue(undefined);
        vi.spyOn(WhoIsTyping, "usersTypingApartFromMe").mockReturnValue([]);
        vi.spyOn(WhoIsTyping, "usersTypingApartFromMeAndIgnored").mockReturnValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders an empty status region when nobody is typing", () => {
        render(<WhoIsTypingTile room={room} />);
        const status = screen.getByRole("status");
        expect(status).toBeEmptyDOMElement();
    });

    it("shows who is typing", () => {
        render(<WhoIsTypingTile room={room} />);

        vi.spyOn(WhoIsTyping, "usersTypingApartFromMeAndIgnored").mockReturnValue([bob]);
        act(() => {
            client.emit(RoomMemberEvent.Typing);
        });
        expect(screen.getByRole("status")).toHaveTextContent("Bob is typing");
    });

    it("lists users in the order they started typing", () => {
        const alice = { userId: "@alice:example.org", name: "Alice" } as RoomMember;
        const carol = { userId: "@carol:example.org", name: "Carol" } as RoomMember;
        render(<WhoIsTypingTile room={room} />);

        vi.spyOn(WhoIsTyping, "usersTypingApartFromMeAndIgnored").mockReturnValue([carol]);
        act(() => {
            client.emit(RoomMemberEvent.Typing);
        });
        vi.spyOn(WhoIsTyping, "usersTypingApartFromMeAndIgnored").mockReturnValue([alice, carol]);
        act(() => {
            client.emit(RoomMemberEvent.Typing);
        });

        expect(screen.getByRole("status")).toHaveTextContent("Carol and Alice are typing");
    });

    it("shows nothing when typing notifications are turned off", () => {
        showTypingNotifications = false;
        vi.spyOn(WhoIsTyping, "usersTypingApartFromMe").mockReturnValue([bob]);
        render(<WhoIsTypingTile room={room} />);
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });
});
