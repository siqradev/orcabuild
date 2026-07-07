export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message:    string,
    public readonly code?:      string  // ex: "PROJECT_NOT_FOUND"
  ) {
    super(message);
    this.name = "AppError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
