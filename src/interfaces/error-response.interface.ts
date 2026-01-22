export interface ErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
}
