export interface IAuthStrategy {
  name: string;
  validate(credentials: any): Promise<any>;
  login(user: any): Promise<any>;
  register?(credentials: any): Promise<any>;
}
