import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IQuery, IQueryHandler, IQueryResult } from '../interfaces/query.interface';
import { QUERY_HANDLER_METADATA } from '../decorators/query-handler.decorator';

@Injectable()
export class QueryBus {
  private handlers = new Map<string, IQueryHandler>();

  constructor(private readonly moduleRef: ModuleRef) {}

  register(queryType: string, handler: IQueryHandler) {
    this.handlers.set(queryType, handler);
  }

  async execute<TQuery extends IQuery, TResult = any>(
    query: TQuery
  ): Promise<IQueryResult<TResult>> {
    const queryType = query.constructor.name;
    const handler = this.handlers.get(queryType);

    if (!handler) {
      throw new NotFoundException(`Query handler not found for ${queryType}`);
    }

    try {
      const result = await handler.handle(query);
      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  async registerHandlers() {
    const providers = this.moduleRef.entries.values();
    for (const provider of providers) {
      const metadata = Reflect.getMetadata(QUERY_HANDLER_METADATA, provider.constructor);
      if (metadata) {
        this.register(metadata.name, provider as IQueryHandler);
      }
    }
  }
}
