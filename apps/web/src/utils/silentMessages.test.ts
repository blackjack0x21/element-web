/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, expect, it } from "vitest";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";

import { attachSilentFlag, getSilentPrefixLength, isSilentMessage, SILENT_MESSAGE_CONTENT_KEY } from "./silentMessages";

describe("silentMessages", () => {
    describe("getSilentPrefixLength", () => {
        it.each([
            ["@silent hello", 8],
            ["@silent   hello", 10],
            ["@silent hello @silent", 8],
        ])("returns the prefix length for %j", (text, length) => {
            expect(getSilentPrefixLength(text)).toBe(length);
        });

        it.each(["", "hello", "@silent", "@silent   ", "@silenthello", " @silent hello", "@SILENT hello"])(
            "returns 0 for %j",
            (text) => {
                expect(getSilentPrefixLength(text)).toBe(0);
            },
        );

        it("accepts a prefix with nothing after it when more content follows", () => {
            expect(getSilentPrefixLength("@silent ", true)).toBe(8);
            expect(getSilentPrefixLength("@silent", true)).toBe(0);
        });
    });

    it("marks content as silent", () => {
        const content: Record<string, unknown> = { body: "hello" };
        attachSilentFlag(content);
        expect(content).toEqual({ body: "hello", [SILENT_MESSAGE_CONTENT_KEY]: true });
    });

    describe("isSilentMessage", () => {
        const createEvent = (content: Record<string, unknown>): MatrixEvent =>
            new MatrixEvent({ type: "m.room.message", room_id: "!room:test", sender: "@alice:test", content });

        it("detects silent messages", () => {
            expect(isSilentMessage(createEvent({ body: "hi", [SILENT_MESSAGE_CONTENT_KEY]: true }))).toBe(true);
        });

        it.each([undefined, false, "true", 1])("ignores a flag of %j", (value) => {
            expect(isSilentMessage(createEvent({ body: "hi", [SILENT_MESSAGE_CONTENT_KEY]: value }))).toBe(false);
        });
    });
});
