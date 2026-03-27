import { DynamicModule, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UnitOfWork } from './unit-of-work/unit-of-work';
import { RepositoryFactory } from './factory/repository.factory';
import { UserRepository } from './implementations/user.repository';
import { UserActivityRepository } from './implementations/user-activity.repository';

@Module({})
export class RepositoryModule {
  static forRoot(): DynamicModule {
    return {
      module: RepositoryModule,
      providers: [
        {
          provide: UnitOfWork,
          useFactory: (dataSource: DataSource) => new UnitOfWork(dataSource),
          inject: [DataSource],
        },
        {
          provide: RepositoryFactory,
          useFactory: (dataSource: DataSource, unitOfWork: UnitOfWork) => 
            new RepositoryFactory(dataSource, unitOfWork),
          inject: [DataSource, UnitOfWork],
        },
      ],
      exports: [UnitOfWork, RepositoryFactory],
    };
  }

  static forEntities(entities: any[]): DynamicModule {
    const repositories = entities.map(entity => {
      const repositoryName = `${entity.name}Repository`;
      return {
        provide: repositoryName,
        useFactory: (factory: RepositoryFactory) => factory.getRepository(entity),
        inject: [RepositoryFactory],
      };
    });

    return {
      module: RepositoryModule,
      providers: repositories,
      exports: repositories,
    };
  }

  static forCustomRepositories(repositories: any[]): DynamicModule {
    const customRepositories = repositories.map(repo => ({
      provide: repo,
      useFactory: (factory: RepositoryFactory) => factory.getCustomRepository(repo),
      inject: [RepositoryFactory],
    }));

    return {
      module: RepositoryModule,
      providers: customRepositories,
      exports: customRepositories,
    };
  }
}
