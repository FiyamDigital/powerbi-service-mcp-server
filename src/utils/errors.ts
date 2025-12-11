export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class PowerBIError extends AppError {
  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message, statusCode, 'POWERBI_ERROR', details);
    this.name = 'PowerBIError';
  }
}

export class PBIToolsError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 500, 'PBI_TOOLS_ERROR', details);
    this.name = 'PBIToolsError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
