import { Client, type Collection, GatewayIntentBits } from "discord.js";
import { Shoukaku, Connectors } from "shoukaku";

import { error, warning } from "./src/utils/logger.js";
import type { Command } from "./src/types/command.js";
import { Option, Panic } from "./src/utils/lib.js";
import { initializeListeners } from "./src/initializeListeners.js";

declare module "discord.js" {
	export interface Client {
		commands: Collection<string, Command>;
		shoukaku: Shoukaku;
	}
}

process.on("warning", (war) => {
	warning(war.message);
});

const client = new Client<boolean>({
	intents: [
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMembers,
	],
});

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), [
	{
		name: "Localhost",
		url: Option.From(process.env.LAVALINK_URL).unwrap(),
		auth: Option.From(process.env.LAVALINK_PASSWORD).unwrap(),
	},
]);

client.shoukaku = shoukaku;

initializeListeners(client);

process.on("uncaughtException", (err: Error) => {
	error(
		`An error, possible unrelated to commands, was thrown:\n${err.message}`,
		Option.From(err.stack),
	);

	if (err instanceof Panic) {
		process.exit(1);
	}
});
