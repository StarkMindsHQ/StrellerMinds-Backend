import { Injectable, Type } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { IRepositoryFactory, IRepository } from '../interfaces/repository.interface';
import { BaseRepository } from '../base/base.repository';
import { UnitOfWork } from '../unit-of-work/unit-of-work';
import { REPOSITORY_METADATA_KEY } from '../decorators/repository.decorators';

@Injectable()
export class RepositoryFactory implements IRepositoryFactory {
  constructor(
    private readonly dataSource: DataSource,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  getRepository<T>(entity: Type<T>): IRepository<T> {
    const repository = this.dataSource.getRepository(entity);
    
    // Create a dynamic repository class that extends BaseRepository
    const DynamicRepository = class extends BaseRepository<T> {
      constructor() {
        super(repository);
      }
    };

    return new DynamicRepository();
  }

  getCustomRepository<T>(repositoryClass: Type<T>): T {
    const options = Reflect.getMetadata(REPOSITORY_METADATA_KEY, repositoryClass) || {};
    const entity = options.entity;
    
    if (!entity) {
      throw new Error(`Repository class ${repositoryClass.name} must specify an entity in @Repository decorator`);
    }

    const repository = this.dataSource.getRepository(entity);
    
    // Check if repository class extends BaseRepository
    if (this.isBaseRepository(repositoryClass)) {
      return new repositoryClass(repository, this.unitOfWork);
    }

    throw new Error(`Custom repository ${repositoryClass.name} must extend BaseRepository`);
  }

  private isBaseRepository(repositoryClass: any): boolean {
    let current = repositoryClass;
    
    while (current && current !== Object) {
      if (current === BaseRepository) {
        return true;
      }
      current = Object.getPrototypeOf(current);
    }
    
    return false;
  }

  getTransactionalRepository<T>(entity: Type<T>): IRepository<T> {
    const repository = this.getRepository(entity);
    
    return new Proxy(repository, {
      get(target, prop) {
        const value = target[prop];
        
        if (typeof value === 'function' && prop !== 'createQueryBuilder') {
          return function (...args: any[]) {
            if (unitOfWork.isTransactionActive()) {
              // Use transaction manager if transaction is active
              const manager = unitOfWork.getManager();
              const transactionalRepository = manager.getRepository(entity);
              const transactionalRepo = new (target.constructor as any)(transactionalRepository);
              return transactionalRepo[prop](...args);
            }
            
            return value.apply(target, args);
          };
        }
        
        return value;
      }
    });
  }
}
