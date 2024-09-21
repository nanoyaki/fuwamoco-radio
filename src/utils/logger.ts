import { platform } from "node:os";
import { join } from "node:path";
import { appendFileSync } from "node:fs";
import { Option } from "./lib";

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

export const logPath: Option<string> = Option.From<string>(
	process.env.USE_FILE_LOGGING,
).isSome()
	? Option.From(join(Bun.main.replace("index.ts", ""), "var/log/bot.log"))
	: Option.None();
export const nl = platform() === "win32" ? "\r\n" : "\n";

const logLevelEnvVar = Option.From<string>(process.env.LOG_LEVEL);
const logLevel: number = logLevelEnvVar.isSome()
	? Number.parseInt(logLevelEnvVar.unwrap())
	: LogLevel.Info;

export function error(message: string, trace: Option<string> = Option.None()) {
	if (logLevel > LogLevel.Error) {
		return;
	}

	writeLog(
		`${message}${trace.isSome() ? `${nl}${trace}` : ""}`,
		"[ERROR]",
		TerminalInit.BoldRed,
	);
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

	Bun.stdout.writer().write(`${init}${logFileMsg}`);

	if (logPath.isSome()) {
		const path = logPath.unwrap();
		const logFile = Bun.file(path);

		logFile
			.exists()
			.then(() => appendFileSync(path, logFileMsg))
			.catch(async () => await Bun.write(path, logFileMsg));
	}
}
