import { Module } from "@nestjs/common"
import { GraphQLModule } from "@nestjs/graphql"
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo"
import { join } from "path"

import { UserModule } from "./modules/user/user.module"
import { PostModule } from "./modules/post/post.module"
import { AnalyticsModule } from "./modules/analytics/analytics.module"
import { AuthModule } from "./modules/auth/auth.module"

import type { GraphQLContext } from "./types/context.type"
import { GraphQLComplexityPlugin } from "./plugins/complexity.plugin"
import { GraphQLLoggingPlugin } from "./plugins/logging.plugin"
import { GraphQLCachePlugin } from "./plugins/cache.plugin"

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/graphql/schema.gql"),
      sortSchema: true,
      playground: process.env.NODE_ENV !== "production",
      introspection: true,
      subscriptions: {
        "graphql-ws": true,
        "subscriptions-transport-ws": true,
      },
      context: ({ req, res, connection, extra }): GraphQLContext => {
        if (connection) {
          // WebSocket connection for subscriptions
          return {
            req: connection.context.req,
            res: connection.context.res,
            user: connection.context.user,
            dataSources: {},
          }
        }
        // HTTP request
        return {
          req,
          res,
          user: req.user,
          dataSources: {},
        }
      },
      formatError: (error) => {
        console.error("GraphQL Error:", error)
        return {
          message: error.message,
          code: error.extensions?.code,
          path: error.path,
          timestamp: new Date().toISOString(),
        }
      },
      plugins: [new GraphQLComplexityPlugin(), new GraphQLLoggingPlugin(), new GraphQLCachePlugin()],
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
      },
    }),
    UserModule,
    PostModule,
    AnalyticsModule,
    AuthModule,
  ],
})
export class GraphQLApiModule {}
