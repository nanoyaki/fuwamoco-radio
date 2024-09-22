export class Panic extends Error {}

export class Option<T> {
	private constructor(private readonly value: NonNullable<T> | null) {}

	/**
	 * Create an Option<T> from a possibly null result
	 *
	 * @param value a "some" (any type) or "none" (null or undefined) value
	 */
	public static From<T>(value?: T | null | undefined): Option<T> {
		return new Option<T>(value ?? null);
	}

	public static Some<T>(value: NonNullable<T>): Option<T> {
		return new Option<T>(value);
	}

	public static None<T>(): Option<T> {
		return new Option<T>(null);
	}

	public isSome(): boolean {
		return this.value !== null;
	}

	public isNone(): boolean {
		return this.value === null;
	}

	public unwrap(): T {
		if (this.value === null) {
			throw new Panic("Tried to unwrap a None value!");
		}

		return this.value;
	}

	public unwrapOr(value: T): T {
		return this.value === null ? value : this.value;
	}
}

export class ResultError<ErrorEnum extends string> {
	constructor(public readonly message: ErrorEnum) {}
}

export class Result<T, E extends string> {
	private constructor(
		private readonly value: T | null,
		private readonly err: ResultError<E> | null,
	) {}

	/**
	 * Turn anything that throws exceptions into a Result Type
	 *
	 * @param value The callback that might throw an exception
	 * @param error The error enum to return on exception
	 * @returns {Result<T, E>}
	 */
	static From<T, E extends string>(value: () => T, error: E): Result<T, E> {
		try {
			return Result.Ok(value());
		} catch {
			return Result.Err(error);
		}
	}

	/**
	 * Turn anything async that throws exceptions into a Result Type
	 *
	 * @param value The async callback that might throw an exception
	 * @param error The error enum to return on exception
	 * @returns {Promise<Result<T, E>>}
	 */
	static async FromAsync<T, E extends string>(
		value: () => Promise<T>,
		error: E,
	): Promise<Result<T, E>> {
		try {
			return Result.Ok(await value());
		} catch {
			return Result.Err(error);
		}
	}

	static Ok<T, E extends string>(value: T): Result<T, E> {
		return new Result<T, E>(value, null);
	}

	static Err<T, E extends string>(error: E): Result<T, E> {
		return new Result<T, E>(null, new ResultError(error));
	}

	isOk(): boolean {
		return this.value !== null;
	}

	isErr(): boolean {
		return this.err !== null;
	}

	error(): E {
		if (this.err === null) {
			throw new Panic("Tried to access an error of a Result.");
		}

		return this.err.message;
	}

	unwrap(): T {
		if (this.value === null) {
			throw new Panic(
				this.err !== null
					? this.err.message
					: "Tried to unwrap an errored Result value!",
			);
		}

		return this.value;
	}

	unwrapOr(value: T): T {
		return this.value === null ? value : this.value;
	}
}

export function matchResult<T, E extends string>(
	actual: Result<T, E>,
	Ok: (result: T) => T,
	Err: (error: E) => T,
): T {
	if (actual.isOk()) {
		return Ok(actual.unwrap());
	}

	if (actual.isErr()) {
		return Err(actual.error());
	}

	throw new Panic("Result is neither Err nor Ok!");
}

export function matchOption<T>(
	actual: Option<T>,
	Some: (result: T) => Promise<T> | T,
	None: () => Promise<T> | T,
): Promise<T> | T {
	if (actual.isSome()) {
		return Some(actual.unwrap());
	}

	if (actual.isNone()) {
		return None();
	}

	throw new Panic("Option is neither Some nor None!");
}
