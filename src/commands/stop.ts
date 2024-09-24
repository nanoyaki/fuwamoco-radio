import { type CommandInteraction, SlashCommandBuilder } from "discord.js";
import type { CommandEntrypoint } from "../types/command.js";
import { warning } from "../utils/logger.js";
import { Option } from "../utils/lib.js";

export const metadata = new SlashCommandBuilder()
	.setName("stop")
	.setDescription(
		"Stop the current song, clear everything, and leave the channel",
	);

export const entrypoint: CommandEntrypoint = async (
	interaction: CommandInteraction,
): Promise<void> => {
	if (!interaction.inGuild()) {
		warning("User tried calling command from outside a Guild! Aborting.");
		return;
	}

	if (!interaction.inCachedGuild()) {
		warning("Guild isn't cached! Caching...");
		await interaction.client.guilds.fetch(interaction.guildId);
		return;
	}

	const connectionOption = Option.From(
		interaction.client.shoukaku.connections.get(interaction.guildId),
	);
	if (connectionOption.isNone()) {
		await interaction.editReply("I'm not connected to any voice channel.");
		return;
	}
	const connection = connectionOption.unwrap();

	if (connection.state === 5) {
		await interaction.editReply("I'm already disconnected.");
		return;
	}

	const voiceChannel = Option.From(interaction.member.voice.channel);
	if (
		voiceChannel.isNone() ||
		voiceChannel.unwrap().id !== connection.channelId
	) {
		await interaction.editReply(
			"You're not connected to the same channel as me.",
		);
		return;
	}

	const player = Option.From(
		interaction.client.shoukaku.players.get(interaction.guildId),
	);
	if (player.isSome()) {
		await player.unwrap().destroy();
	}

	connection.disconnect();

	await interaction.editReply("Stopped.");
};
