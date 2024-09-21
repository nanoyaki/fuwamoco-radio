import { ButtonBuilder, ButtonStyle } from "discord.js";

export const confirmButton = new ButtonBuilder()
	.setCustomId("confirm")
	.setLabel("Confirm")
	.setStyle(ButtonStyle.Primary);
