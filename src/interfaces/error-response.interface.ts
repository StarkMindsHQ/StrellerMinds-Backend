export interface ErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}
