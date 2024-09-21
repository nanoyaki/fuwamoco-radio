import type { ClientEvents, Events } from "discord.js";

export type EventType = "on" | "once";

export type EventModule = {
	event: keyof ClientEvents;
	type: EventType;
	handler: EventHandler<Events>;
};

export type EventHandler<Event extends keyof ClientEvents> = (
	...args: ClientEvents[Event]
) => Promise<void> | void;
