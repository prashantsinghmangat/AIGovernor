import type { ErrorCode } from '@/types/api';

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createErrorResponse(error: AppError) {
  return Response.json(
    { error: error.message, code: error.code, details: error.details },
    { status: error.status }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return createErrorResponse(error);
  }
  console.error('Unhandled error:', error);
  return createErrorResponse(
    new AppError('An unexpected error occurred', 'INTERNAL_ERROR', 500)
  );
}
