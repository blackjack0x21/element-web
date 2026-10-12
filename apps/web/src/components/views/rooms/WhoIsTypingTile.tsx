/*
Copyright 2017-2024 New Vector Ltd.
Copyright 2015, 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { type Room, RoomEvent, type RoomMember, RoomMemberEvent, type MatrixEvent } from "matrix-js-sdk/src/matrix";

import * as WhoIsTyping from "../../../WhoIsTyping";
import Timer from "../../../utils/Timer";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import SettingsStore from "../../../settings/SettingsStore";

interface IProps {
    // the room this statusbar is representing.
    room: Room;
    // Number of names to display in typing indication. E.g. set to 3, will
    // result in "X, Y, Z and 100 others are typing."
    whoIsTypingLimit: number;
}

interface IState {
    usersTyping: RoomMember[];
    // a map with userid => Timer to delay
    // hiding the "x is typing" message for a
    // user so hiding it can coincide
    // with the sent message by the other side
    // resulting in less timeline jumpiness
    delayedStopTypingTimers: Record<string, Timer>;
    showTypingNotifications: boolean;
}

/**
 * A fixed-height strip below the composer that says who is typing. It is always rendered, so showing and
 * hiding the text never changes the height of the timeline.
 */
export default class WhoIsTypingTile extends React.Component<IProps, IState> {
    public static defaultProps = {
        whoIsTypingLimit: 3,
    };

    public state: IState = {
        usersTyping: WhoIsTyping.usersTypingApartFromMe(this.props.room),
        delayedStopTypingTimers: {},
        showTypingNotifications: SettingsStore.getValue("showTypingNotifications"),
    };

    private showTypingNotificationsWatcherRef?: string;

    // Order in which we first saw each user typing, so the longest-typing user is listed first. Users who were
    // already typing when we mounted have no entry and are listed first, by name.
    private typingStartOrder = new Map<string, number>();
    private nextTypingStartOrder = 0;

    public componentDidMount(): void {
        this.showTypingNotificationsWatcherRef = SettingsStore.watchSetting(
            "showTypingNotifications",
            null,
            this.onShowTypingNotificationsChange,
        );
        MatrixClientPeg.safeGet().on(RoomMemberEvent.Typing, this.onRoomMemberTyping);
        MatrixClientPeg.safeGet().on(RoomEvent.Timeline, this.onRoomTimeline);
    }

    public componentWillUnmount(): void {
        SettingsStore.unwatchSetting(this.showTypingNotificationsWatcherRef);
        // we may have entirely lost our client as we're logging out before clicking login on the guest bar...
        const client = MatrixClientPeg.get();
        if (client) {
            client.removeListener(RoomMemberEvent.Typing, this.onRoomMemberTyping);
            client.removeListener(RoomEvent.Timeline, this.onRoomTimeline);
        }
        Object.values(this.state.delayedStopTypingTimers).forEach((t) => t.abort());
    }

    private onShowTypingNotificationsChange = (): void => {
        this.setState({ showTypingNotifications: SettingsStore.getValue("showTypingNotifications") });
    };

    private onRoomTimeline = (event: MatrixEvent, room?: Room): void => {
        if (room?.roomId === this.props.room.roomId) {
            const userId = event.getSender()!;
            this.typingStartOrder.delete(userId);
            // remove user from usersTyping
            const usersTyping = this.state.usersTyping.filter((m) => m.userId !== userId);
            if (usersTyping.length !== this.state.usersTyping.length) {
                this.setState({ usersTyping });
            }
            // abort timer if any
            this.abortUserTimer(userId);
        }
    };

    private onRoomMemberTyping = (): void => {
        const usersTyping = WhoIsTyping.usersTypingApartFromMeAndIgnored(this.props.room);
        for (const member of usersTyping) {
            if (!this.typingStartOrder.has(member.userId)) {
                this.typingStartOrder.set(member.userId, this.nextTypingStartOrder++);
            }
        }
        this.setState({
            delayedStopTypingTimers: this.updateDelayedStopTypingTimers(usersTyping),
            usersTyping,
        });
    };

    private updateDelayedStopTypingTimers(usersTyping: RoomMember[]): Record<string, Timer> {
        const usersThatStoppedTyping = this.state.usersTyping.filter((a) => {
            return !usersTyping.some((b) => a.userId === b.userId);
        });
        const usersThatStartedTyping = usersTyping.filter((a) => {
            return !this.state.usersTyping.some((b) => a.userId === b.userId);
        });
        // abort all the timers for the users that started typing again
        usersThatStartedTyping.forEach((m) => {
            const timer = this.state.delayedStopTypingTimers[m.userId];
            if (timer) {
                timer.abort();
            }
        });
        // prepare new delayedStopTypingTimers object to update state with
        let delayedStopTypingTimers = Object.assign({}, this.state.delayedStopTypingTimers);
        // remove members that started typing again
        delayedStopTypingTimers = usersThatStartedTyping.reduce((delayedStopTypingTimers, m) => {
            delete delayedStopTypingTimers[m.userId];
            return delayedStopTypingTimers;
        }, delayedStopTypingTimers);
        // start timer for members that stopped typing
        delayedStopTypingTimers = usersThatStoppedTyping.reduce((delayedStopTypingTimers, m) => {
            if (!delayedStopTypingTimers[m.userId]) {
                const timer = new Timer(5000);
                delayedStopTypingTimers[m.userId] = timer;
                timer.start();
                timer.finished().then(
                    () => this.removeUserTimer(m.userId), // on elapsed
                    () => {
                        /* aborted */
                    },
                );
            }
            return delayedStopTypingTimers;
        }, delayedStopTypingTimers);

        return delayedStopTypingTimers;
    }

    private abortUserTimer(userId: string): void {
        const timer = this.state.delayedStopTypingTimers[userId];
        if (timer) {
            timer.abort();
            this.removeUserTimer(userId);
        }
    }

    private removeUserTimer(userId: string): void {
        this.typingStartOrder.delete(userId);
        const timer = this.state.delayedStopTypingTimers[userId];
        if (timer) {
            const delayedStopTypingTimers = Object.assign({}, this.state.delayedStopTypingTimers);
            delete delayedStopTypingTimers[userId];
            this.setState({ delayedStopTypingTimers });
        }
    }

    public render(): React.ReactNode {
        const usersTyping = [...this.state.usersTyping];
        // append the users that have been reported not typing anymore
        // but have a timeout timer running so they can disappear
        // when a message comes in
        for (const userId in this.state.delayedStopTypingTimers) {
            const member = this.props.room.getMember(userId);
            if (member) usersTyping.push(member);
        }

        // Order by who started typing first, so names don't jump around as people join in or stop. Users with no
        // recorded start (already typing when we mounted) come first, sorted by name.
        const collator = new Intl.Collator();
        const startOrder = (m: RoomMember): number => this.typingStartOrder.get(m.userId) ?? -1;
        usersTyping.sort((a, b) => startOrder(a) - startOrder(b) || collator.compare(a.name, b.name));

        const typingString = this.state.showTypingNotifications
            ? WhoIsTyping.whoIsTypingString(usersTyping, this.props.whoIsTypingLimit)
            : "";

        return (
            <div className="mx_WhoIsTypingTile" role="status" aria-live="polite" aria-atomic="true">
                {typingString && (
                    <>
                        <span className="mx_WhoIsTypingTile_dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
                        <span className="mx_WhoIsTypingTile_label">{typingString}</span>
                    </>
                )}
            </div>
        );
    }
}
