import { URL } from "node:url";

import {
	SlashCommandBuilder,
	ActionRowBuilder,
	type ButtonBuilder,
	type CommandInteraction,
} from "discord.js";

import { cancelButton } from "../buttons/cancel.js";
import { confirmButton } from "../buttons/confirm.js";
import type { CommandEntrypoint } from "../types/command.js";
import { debug, info, warning } from "../utils/logger.js";
import { Option, Result } from "../utils/lib.js";
import { LoadType, type LavalinkResponse, type Track } from "shoukaku";

export const metadata = new SlashCommandBuilder()
	.setName("play")
	.setDescription("Play a song or playlist")
	.addStringOption((option) =>
		option
			.setName("keywords_or_url")
			.setDescription(
				"The keywords of a song title or a URL to a song or playlist",
			)
			.setRequired(true),
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

	const voiceChannel = interaction.member.voice.channel;
	if (voiceChannel === null) {
		await interaction.editReply("You're not in a voice channel!");
		info("User is not in a voice channel. Aborting.");
		return;
	}

	if (!voiceChannel.joinable) {
		await interaction.editReply(
			"Can't join your voice channel! " +
				"I might not have sufficient permissions.",
		);
		warning("Can't join a user's voice channel.");
		return;
	}

	const keywordsOrUrl = Option.From<string | number | boolean>(
		interaction.options.get("keywords_or_url", true).value,
	);
	if (keywordsOrUrl.isNone()) {
		await interaction.editReply("Something went horribly wrong...");
		warning(
			"The required keyword wasn't provided. Did the discord API mess up?",
		);
		return;
	}
	const keywordsOrUrlString = keywordsOrUrl.unwrap().toString();

	const url = Result.From(
		() => new URL(keywordsOrUrlString),
		URLError.InternalError,
	);

	const shoukaku = interaction.client.shoukaku;

	const existingPlayer = Option.From(shoukaku.players.get(interaction.guildId));

	if (existingPlayer.isSome()) {
		existingPlayer.unwrap().stopTrack();
	}

	let connectionOption = Option.From(
		shoukaku.connections.get(interaction.guildId),
	);
	if (connectionOption.isSome() && connectionOption.unwrap().state !== 2) {
		debug(
			"Bot is probably not connected but a " +
				"connection exists. Trying to reconnect.",
		);

		// Bot is not connected so destroy the previous player first
		if (existingPlayer.isSome()) {
			await existingPlayer.unwrap().destroy();
		}

		connectionOption.unwrap().setStateUpdate({
			channel_id: voiceChannel.id,
			self_deaf: true,
			self_mute: false,
		});
		await connectionOption.unwrap().connect();
	}

	// Connected but player malfunctioned
	if (
		connectionOption.isSome() &&
		connectionOption.unwrap().state === 2 &&
		existingPlayer.isSome() &&
		existingPlayer.unwrap().paused !== true
	) {
		shoukaku.connections.delete(interaction.guildId);
		shoukaku.players.delete(interaction.guildId);
	}

	const player = Option.From(
		shoukaku.players.get(interaction.guildId),
	).unwrapOr(
		await shoukaku.joinVoiceChannel({
			guildId: interaction.guildId,
			channelId: voiceChannel.id,
			shardId: 0,
			deaf: true,
			mute: false,
		}),
	);

	// Connection is now definitely initialized
	// here we get the connection so that we can
	// listen for disconnects later
	connectionOption = connectionOption.isNone()
		? Option.From(shoukaku.connections.get(player.guildId))
		: connectionOption;
	if (connectionOption.isNone()) {
		await interaction.editReply(
			"Couldn't connect to the channel. " +
				"I might not have sufficient permissions.",
		);
		return;
	}
	const connection = connectionOption.unwrap();

	const lavalinkNodeOption = Option.From(
		shoukaku.options.nodeResolver(shoukaku.nodes, connection),
	);
	if (lavalinkNodeOption.isNone()) {
		await interaction.editReply(
			"There was an error trying to get the Lavalink node.",
		);
		return;
	}
	const lavalinkNode = lavalinkNodeOption.unwrap();

	let lavalinkResult: Option<LavalinkResponse> = url.isOk()
		? Option.From(await lavalinkNode.rest.resolve(url.unwrap().toString()))
		: Option.None();
	if (url.isErr()) {
		lavalinkResult = Option.None();
		for (
			let i = 0;
			i < searchPrefixes.length &&
			(lavalinkResult.isNone() ||
				lavalinkResult.unwrap().loadType === LoadType.EMPTY);
			i++
		) {
			lavalinkResult = Option.From<LavalinkResponse>(
				await lavalinkNode.rest.resolve(
					`${searchPrefixes[i]}${keywordsOrUrlString}`,
				),
			);
		}
	}

	if (lavalinkResult.isNone()) {
		debug(url.unwrap().toString());
		lavalinkResult = Option.From(
			await lavalinkNode.rest.resolve(keywordsOrUrlString),
		);
	}

	if (lavalinkResult.isNone()) {
		await interaction.editReply("Lavalink did not return a valid result.");
		return;
	}

	const lavalinkResponse = lavalinkResult.unwrap();

	if (
		lavalinkResponse.loadType === LoadType.EMPTY ||
		(lavalinkResponse.loadType === LoadType.SEARCH &&
			lavalinkResponse.data.length < 1)
	) {
		await interaction.editReply("No results found for your search query.");
		return;
	}

	if (lavalinkResponse.loadType === LoadType.ERROR) {
		await interaction.editReply(
			"There was an error whilst trying to get an audio stream from Lavalink. " +
				"Try again later and contact the developer of this bot.",
		);
		return;
	}

	if (lavalinkResponse.loadType === LoadType.PLAYLIST) {
		await interaction.editReply("Playlists are not supported yet.");
		return;
	}

	let trackMetadata: Track;
	if (lavalinkResponse.loadType === LoadType.SEARCH) {
		trackMetadata = lavalinkResponse.data[0];
		const url = Option.From(trackMetadata.info.uri);

		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			confirmButton,
			cancelButton,
		);

		const foundVideo = url.isSome()
			? `[${trackMetadata.info.title}](${url.unwrap()})`
			: trackMetadata.info.title;
		const confirmationPrompt = await interaction.editReply({
			content: `Found video: ${foundVideo} uploaded by ${trackMetadata.info.author}`,
			components: [buttons],
		});

		const confirmationResult = await Result.FromAsync(async () => {
			const confirmation = await confirmationPrompt.awaitMessageComponent({
				filter: (i) => i.user.id === interaction.user.id,
				time: 30_000,
			});

			if (confirmation.customId === "confirm") {
				return true;
			}

			return false;
		}, ConfirmationError.Timeout);

		if (confirmationResult.isErr() || !confirmationResult.unwrap()) {
			await confirmationPrompt.edit({
				content: "Cancelled.",
				components: [],
			});
			return;
		}
	} else {
		trackMetadata = lavalinkResponse.data;
	}

	const trackUrl = Option.From(trackMetadata.info.uri);
	const foundVideo = trackUrl.isSome()
		? `[${trackMetadata.info.title}](${trackUrl.unwrap()})`
		: trackMetadata.info.title;

	await player.playTrack({ track: { encoded: trackMetadata.encoded } });

	await interaction.editReply({
		content: `Now playing ${foundVideo} by ${trackMetadata.info.author}`,
		components: [],
	});
};

const searchPrefixes = ["ytmsearch:", "ytsearch:", "scsearch:"];

enum URLError {
	InternalError = "The provided URL might not have been valid",
}

enum ConfirmationError {
	Timeout = "Confirmation timed out",
}
