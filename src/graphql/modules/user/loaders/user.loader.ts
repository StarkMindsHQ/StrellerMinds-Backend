import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';

import type { UserService } from '../services/user.service';
import type { User } from '../entities/user.entity';

@Injectable()
export class UserLoader {
  private readonly loader: DataLoader<string, User | null>;

  constructor(private readonly userService: UserService) {
    this.loader = new DataLoader<string, User | null>(
      async (ids: readonly string[]) => {
        const users = await this.userService.findByIds([...ids]);
        const userMap = new Map(users.map((user) => [user.id, user]));

        return ids.map((id) => userMap.get(id) || null);
      },
      {
        cache: true,
        maxBatchSize: 100,
      },
    );
  }

  async load(id: string): Promise<User | null> {
    return this.loader.load(id);
  }

  async loadMany(ids: string[]): Promise<(User | null)[]> {
    return this.loader.loadMany(ids);
  }

  clear(id: string): void {
    this.loader.clear(id);
  }

  clearAll(): void {
    this.loader.clearAll();
  }
}
