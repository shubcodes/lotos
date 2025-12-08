import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export type LotOsErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'INVALID_URI';

export class LotOsError extends Error {
  public readonly cause?: Error;

  constructor(
    public readonly lotOsCode: LotOsErrorCode,
    message: string,
    options?: { cause?: Error }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.cause = options?.cause;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class InvalidUriError extends LotOsError {
  constructor(uri: string, reason: string) {
    super('INVALID_URI', `${reason} [uri=${uri}]`);
  }
}

export class ValidationError extends LotOsError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends LotOsError {
  constructor(message: string) {
    super('NOT_FOUND', message);
  }
}

export class PermissionDeniedError extends LotOsError {
  constructor(message: string) {
    super('PERMISSION_DENIED', message);
  }
}

export class ConflictError extends LotOsError {
  constructor(message: string) {
    super('CONFLICT', message);
  }
}

export class InternalServerError extends LotOsError {
  constructor(message: string, options?: { cause?: Error }) {
    super('INTERNAL_ERROR', message, options);
  }
}

export function toMcpError(error: unknown): McpError {
  if (error instanceof McpError) {
    return error;
  }

  if (error instanceof LotOsError) {
    switch (error.lotOsCode) {
      case 'NOT_FOUND':
        return new McpError(ErrorCode.InvalidParams, error.message);
      case 'PERMISSION_DENIED':
      case 'CONFLICT':
      case 'VALIDATION_ERROR':
      case 'INVALID_URI':
        return new McpError(ErrorCode.InvalidParams, error.message);
      default:
        return new McpError(ErrorCode.InternalError, error.message);
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  return new McpError(ErrorCode.InternalError, message);
}
