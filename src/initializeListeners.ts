import { join } from "node:path";
import { readdir } from "node:fs/promises";

import type { Client } from "discord.js";

import type { EventModule } from "./types/event";
import { info } from "./utils/logger";

export async function initializeListeners(client: Client) {
	const eventsPath = join(Bun.main.replace("index.ts", ""), "src/events/");
	const eventFiles = (
		await readdir(eventsPath, { withFileTypes: true })
	).filter((file) => file.isFile() && file.name.endsWith(".ts"));

	info("Registering events...");

	for (const eventFile of eventFiles) {
		const eventModule: EventModule = await import(
			join(eventsPath, eventFile.name)
		);

		if (eventModule.type === "once") {
			client.once(eventModule.event, eventModule.handler);
			continue;
		}

		client.on(eventModule.event, eventModule.handler);
	}

	info("Done registering events. Logging in.");

	client.login(Bun.env.APP_TOKEN);
}
