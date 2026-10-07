/*
Copyright 2026 hayaksi1

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import fetchMock from "@fetch-mock/vitest";

import { BackgroundAudio } from "./BackgroundAudio";
import { createAudioContext } from "./compat";

vi.mock("./compat", () => ({
    createAudioContext: vi.fn(),
}));

describe("BackgroundAudio", () => {
    let audioContext: {
        createBufferSource: Mock;
        createGain: Mock;
        decodeAudioData: Mock;
        resume: Mock;
        suspend: Mock;
        destination: object;
    };

    /** The sources handed out by the mocked context, in the order they were created. */
    let sources: Array<{ start: Mock; disconnect: Mock; onended?: () => void }>;
    /** The gain nodes handed out by the mocked context, in the order they were created. */
    let gains: Array<{ connect: Mock; disconnect: Mock; gain: { value: number } }>;

    beforeEach(() => {
        sources = [];
        gains = [];
        audioContext = {
            createBufferSource: vi.fn().mockImplementation(() => {
                const source = { start: vi.fn(), connect: vi.fn(), disconnect: vi.fn() };
                sources.push(source);
                return source;
            }),
            createGain: vi.fn().mockImplementation(() => {
                const gain = { connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1 } };
                gains.push(gain);
                return gain;
            }),
            decodeAudioData: vi.fn().mockResolvedValue({}),
            resume: vi.fn().mockResolvedValue(undefined),
            suspend: vi.fn().mockResolvedValue(undefined),
            destination: {},
        };
        vi.mocked(createAudioContext).mockReturnValue(audioContext as unknown as AudioContext);

        // Every sound is fetched before it is decoded, and the decoding is mocked out above, so the
        // bytes that come back never matter.
        fetchMock.mockReset();
        fetchMock.get("*", 200);
    });

    it("suspends the context once the sound has finished", async () => {
        const audio = new BackgroundAudio();

        await audio.play("sound.mp3");
        expect(audioContext.suspend).not.toHaveBeenCalled();

        sources[0].onended!();

        expect(audioContext.suspend).toHaveBeenCalled();
    });

    it("keeps playing a sound that outlasts one started before it", async () => {
        const audio = new BackgroundAudio();

        await audio.play("first.mp3");
        await audio.play("second.mp3");

        // The first sound finishes while the second is still going.
        sources[0].onended!();

        expect(audioContext.suspend).not.toHaveBeenCalled();

        sources[1].onended!();

        expect(audioContext.suspend).toHaveBeenCalledTimes(1);
    });

    it("plays at full volume by default", async () => {
        const audio = new BackgroundAudio();

        await audio.play("sound.mp3");

        expect(gains[0].gain.value).toBe(1);
        expect(gains[0].connect).toHaveBeenCalledWith(audioContext.destination);
    });

    it("plays at the given volume", async () => {
        const audio = new BackgroundAudio();

        await audio.play("sound.mp3", false, 0.25);

        expect(gains[0].gain.value).toBe(0.25);
    });

    it("disconnects the volume control once the sound has finished", async () => {
        const audio = new BackgroundAudio();

        await audio.play("sound.mp3", false, 0.5);
        sources[0].onended!();

        expect(gains[0].disconnect).toHaveBeenCalled();
    });
});
