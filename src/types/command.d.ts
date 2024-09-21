import type { CommandInteraction, SlashCommandBuilder } from "discord.js";

export type Command = {
	metadata: SlashCommandBuilder;
	entrypoint: CommandEntrypoint;
};

export type CommandEntrypoint = (
	interaction: CommandInteraction,
) => Promise<void>;
