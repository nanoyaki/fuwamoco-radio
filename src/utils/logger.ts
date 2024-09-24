import { platform } from "node:os";
import { join } from "node:path";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { Option } from "./lib.js";

export enum LogLevel {
	Error = 4,
	Warning = 3,
	Info = 2,
	Debug = 1,
}

export enum TerminalInit {
	BoldRed = "\x1b[0;37m\x1b[1;31m",
	Red = "\x1b[0;37m\x1b[0;31m",
	White = "\x1b[0;37m",
	Grey = "\x1b[0;37m\x1b[2;37m",
}

const useFileLogging =
	Option.From<string>(process.env.USE_FILE_LOGGING)
		.unwrapOr("true")
		.toLowerCase() === "true";
export const logPath: string = join(process.cwd(), "var/log/bot.log");
export const nl = platform() === "win32" ? "\r\n" : "\n";

const logLevel: number = Number.parseInt(
	Option.From<string>(process.env.LOG_LEVEL).unwrapOr(`${LogLevel.Info}`),
);

export function error(message: string, trace: Option<string> = Option.None()) {
	if (logLevel > LogLevel.Error) {
		return;
	}

	const logTrace = trace.isSome() ? `${nl}${trace}` : "";
	writeLog(`${message}${logTrace}`, "[ERROR]", TerminalInit.BoldRed);
}

export function warning(message: string) {
	if (logLevel > LogLevel.Warning) {
		return;
	}

	writeLog(`${message}`, "[WARNING]", TerminalInit.Red);
}

export function info(message: string) {
	if (logLevel > LogLevel.Info) {
		return;
	}

	writeLog(`${message}`, "[INFO]", TerminalInit.White);
}

export function debug(message: string) {
	if (logLevel > LogLevel.Debug) {
		return;
	}

	writeLog(`${message}`, "[DEBUG]", TerminalInit.Grey);
}

function writeLog(message: string, prefix: string, init: TerminalInit) {
	const prefixedMsg = message.replaceAll(nl, `${nl}${prefix} `);
	const logFileMsg = `${prefix} ${prefixedMsg}${nl}`;

	process.stdout.write(`${init}${logFileMsg}`);

	if (useFileLogging) {
		if (!existsSync(logPath)) {
			writeFileSync(logPath, logFileMsg);
		}

		appendFileSync(logPath, logFileMsg);
	}
}
