import { Plugin } from "@nestjs/apollo"
import type { ApolloServerPlugin, GraphQLRequestListener } from "apollo-server-plugin-base"
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from "graphql-query-complexity"

@Plugin()
export class GraphQLComplexityPlugin implements ApolloServerPlugin {
  requestDidStart(): GraphQLRequestListener {
    return {
      didResolveOperation({ request, document }) {
        const complexity = getComplexity({
          schema: request.schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [fieldExtensionsEstimator(), simpleEstimator({ maximumComplexity: 1000 })],
        })

        if (complexity > 1000) {
          throw new Error(`Query complexity ${complexity} exceeds maximum allowed complexity of 1000`)
        }

        console.log(`GraphQL Query Complexity: ${complexity}`)
      },
    }
  }
}
