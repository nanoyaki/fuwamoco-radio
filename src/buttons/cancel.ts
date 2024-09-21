import { ButtonBuilder, ButtonStyle } from "discord.js";

export const cancelButton = new ButtonBuilder()
	.setCustomId("cancel")
	.setLabel("Cancel")
	.setStyle(ButtonStyle.Secondary);
