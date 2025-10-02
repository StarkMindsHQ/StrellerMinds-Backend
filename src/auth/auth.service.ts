import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { IAuthStrategy } from './strategies/auth-strategy.interface';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTH_STRATEGIES')
    private readonly strategies: IAuthStrategy[],
  ) {}

  private getStrategy(name: string): IAuthStrategy {
    const strategy = this.strategies.find((s) => s.name === name);
    if (!strategy) {
      throw new BadRequestException(`Unsupported auth strategy: ${name}`);
    }
    return strategy;
  }

  async validate(strategyName: string, credentials: any): Promise<any> {
    const strategy = this.getStrategy(strategyName);
    return strategy.validate(credentials);
  }

  async login(strategyName: string, user: any): Promise<AuthResponseDto> {
    const strategy = this.getStrategy(strategyName);
    return strategy.login(user);
  }

  async register(strategyName: string, credentials: any): Promise<AuthResponseDto> {
    const strategy = this.getStrategy(strategyName);
    if (!strategy.register) {
      throw new BadRequestException(`Register not supported for ${strategyName}`);
    }
    return strategy.register(credentials);
  }
}
