// Implementação robusta do padrão Result

export class Result<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  private readonly _value?: T;
  private readonly _error?: Error;

  private constructor(isSuccess: boolean, value?: T, error?: Error) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message');
    }
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._value = value;
    this._error = error;
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot get the value of an error result');
    }
    return this._value as T;
  }

  public getError(): Error | undefined {
    return this._error;
  }

  public static ok<U>(value: U): Result<U> {
    return new Result<U>(true, value);
  }

  public static fail<U>(error: Error): Result<U> {
    return new Result<U>(false, undefined, error);
  }
}

// Aliases para clareza
export const Success = Result.ok;
export const Failure = Result.fail; 