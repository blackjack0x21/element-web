/*
Copyright 2026 Kreesty

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// The package's own typings only declare the system bus and a few classes
declare module "@homebridge/dbus-native" {
    import type { EventEmitter } from "node:events";

    export interface BusConnection extends EventEmitter {
        end(): void;
    }

    export interface MessageBus {
        connection: BusConnection;
        /** Our unique name on the bus (e.g. ":1.42"), known once the connection is up */
        name?: string;
        invoke(
            message: {
                path: string;
                destination: string;
                interface: string;
                member: string;
                signature?: string;
                body?: unknown[];
            },
            callback: (error: { message?: string } | undefined, value: unknown) => void,
        ): void;
    }

    const dbus: { sessionBus(): MessageBus };
    export default dbus;
}
