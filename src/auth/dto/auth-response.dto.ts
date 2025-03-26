export class AuthResponseDto {
    access_token: string;
    refresh_token?: string; 
    expires_in: number;
    user: { id: string; email: string };
  }
  