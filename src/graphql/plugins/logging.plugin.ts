import { Plugin } from '@nestjs/apollo';
import type { ApolloServerPlugin, GraphQLRequestListener } from 'apollo-server-plugin-base';
import { Logger } from '@nestjs/common';

@Plugin()
export class GraphQLLoggingPlugin implements ApolloServerPlugin {
  private readonly logger = new Logger(GraphQLLoggingPlugin.name);

  requestDidStart(): GraphQLRequestListener {
    return {
      didResolveOperation({ request }) {
        this.logger.log(`GraphQL Operation: ${request.operationName || 'Anonymous'}`);
      },

      didEncounterErrors({ errors }) {
        for (const error of errors) {
          this.logger.error(`GraphQL Error: ${error.message}`, error.stack);
        }
      },

      willSendResponse({ response }) {
        const executionTime = Date.now() - (response.http?.body as any)?.startTime;
        if (executionTime) {
          this.logger.log(`GraphQL Execution Time: ${executionTime}ms`);
        }
      },
    };
  }
}
