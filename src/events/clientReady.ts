import { type Client, type ClientEvents, Events } from "discord.js";
import type { EventHandler, EventType } from "../types/event.js";
import { Panic } from "../utils/lib.js";
import { info } from "../utils/logger.js";
import {
	registerCommands,
	registerCommandsForGuild,
} from "../registerCommands.js";

export const event: keyof ClientEvents = Events.ClientReady;

export const type: EventType = "once";

export const handler: EventHandler<Events.ClientReady> = async (
	client: Client<true>,
) => {
	if (client.user === null) {
		throw new Panic("Bot user is not retrievable");
	}

	info(`Logged in as ${client.user.globalName}.`);
	client.commands = await registerCommands(client.user.id);
	info("Fetching guild data!");
	await client.guilds.fetch();

	info("Registering commands to cached guilds.");
	for (const guild of client.guilds.cache) {
		registerCommandsForGuild(client.user.id, client.commands, guild[0]);
	}

	info("Bot initialized.");
};
