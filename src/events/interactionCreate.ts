import { Events, type ClientEvents, type Interaction } from "discord.js";
import { debug, error } from "../utils/logger.js";
import { Panic } from "../utils/lib.js";
import type { EventHandler } from "../types/event.js";

export const event: keyof ClientEvents = Events.InteractionCreate;

export const handler: EventHandler<Events.InteractionCreate> = async (
	interaction: Interaction,
) => {
	const client = interaction.client;

	if (!interaction.isChatInputCommand()) {
		return;
	}
	await interaction.deferReply();

	const command = client.commands.get(interaction.commandName);
	if (command === undefined) {
		await interaction.editReply("There's no such command");
		return;
	}

	debug("Setting up error handlers for an incoming command.");
	const shoukakuErrorHandler = async (/* name */ _: string, err: Error) => {
		error(err.message);
		await interaction.editReply(
			"The audio player encountered an internal error.",
		);
	};
	const globalErrorHandler = async (err: Error) => {
		if (err instanceof Panic) {
			await interaction.editReply(
				"The application encountered a fatal error. Shutting down.",
			);
		}

		await interaction.editReply(
			"The application encountered an internal error.",
		);
	};
	client.shoukaku.once("error", shoukakuErrorHandler);
	process.once("uncaughtException", globalErrorHandler);

	debug(`Calling command ${interaction.commandName}`);
	await command.entrypoint(interaction);

	client.shoukaku.removeListener("error", shoukakuErrorHandler);
	process.removeListener("uncaughtException", globalErrorHandler);
	debug("Error handlers cleaned up.");
};
