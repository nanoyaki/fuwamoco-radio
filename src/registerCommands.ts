import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { REST, Routes, Collection, type Snowflake } from "discord.js";

import type { Command } from "./types/command.js";
import { info } from "./utils/logger.js";

const discordRestApi = new REST({ version: "10" }).setToken(
	process.env.APP_TOKEN ?? "",
);

export async function registerCommands(
	clientId: string,
): Promise<Collection<string, Command>> {
	const commandsPath = join(process.cwd(), "src/commands/");
	const commandFiles = (
		await readdir(commandsPath, { withFileTypes: true })
	).filter((file) => file.isFile() && file.name.endsWith(".ts"));

	const commands: Collection<string, Command> = new Collection();
	for (const commandFile of commandFiles) {
		const command: Command = await import(join(commandsPath, commandFile.name));
		commands.set(command.metadata.name, command);
	}

	info("Started refreshing application (/) commands.");

	await discordRestApi.put(Routes.applicationCommands(clientId), {
		body: commands.map((command) => command.metadata.toJSON()),
	});

	info("Successfully reloaded application (/) commands.");

	return commands;
}

export async function registerCommandsForGuild(
	clientId: Snowflake,
	commands: Collection<string, Command>,
	guildId: Snowflake,
) {
	await discordRestApi.put(Routes.applicationGuildCommands(clientId, guildId), {
		body: commands.map((command) => command.metadata.toJSON()),
	});
}
