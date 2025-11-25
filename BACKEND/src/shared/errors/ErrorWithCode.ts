export class ErrorWithCode extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ErrorWithCode';
    Object.setPrototypeOf(this, ErrorWithCode.prototype);
  }

  static fromError(
    error: Error,
    code: string,
    details?: Record<string, any>,
  ): ErrorWithCode {
    const errorWithCode = new ErrorWithCode(code, error.message, details);
    errorWithCode.stack = error.stack;
    return errorWithCode;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}
