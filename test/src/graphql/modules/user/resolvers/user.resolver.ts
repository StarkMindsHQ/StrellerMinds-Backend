import { Resolver, Query, Mutation, ResolveField, Parent, Context, Subscription } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { PubSub } from "graphql-subscriptions"

import { User } from "../entities/user.entity"
import type { UserService } from "../services/user.service"
import type { UserLoader } from "../loaders/user.loader"
import type { CreateUserInput } from "../dto/create-user.input"
import type { UpdateUserInput } from "../dto/update-user.input"
import type { UsersArgs } from "../dto/users.args"

import { GqlAuthGuard } from "../../../guards/gql-auth.guard"
import { CurrentUser } from "../../../decorators/current-user.decorator"
import { CacheInterceptor } from "../../../interceptors/cache.interceptor"
import type { GraphQLContext } from "../../../types/context.type"

const pubSub = new PubSub()

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly userLoader: UserLoader,
  ) {}

  @Query(() => [User], { name: "users" })
  @UseInterceptors(CacheInterceptor)
  async getUsers(args: UsersArgs): Promise<User[]> {
    return this.userService.findAll(args)
  }

  @Query(() => User, { name: "user", nullable: true })
  @UseInterceptors(CacheInterceptor)
  async getUser(id: string): Promise<User | null> {
    return this.userLoader.load(id)
  }

  @Query(() => User, { name: "me" })
  @UseGuards(GqlAuthGuard)
  async getCurrentUser(@CurrentUser() user: User): Promise<User> {
    return user
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async createUser(input: CreateUserInput): Promise<User> {
    const user = await this.userService.create(input)

    // Publish subscription event
    pubSub.publish("userCreated", { userCreated: user })

    return user
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async updateUser(id: string, input: UpdateUserInput, @CurrentUser() currentUser: User): Promise<User> {
    const user = await this.userService.update(id, input, currentUser)

    // Publish subscription event
    pubSub.publish("userUpdated", { userUpdated: user })

    return user
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteUser(id: string, @CurrentUser() currentUser: User): Promise<boolean> {
    await this.userService.delete(id, currentUser)

    // Publish subscription event
    pubSub.publish("userDeleted", { userDeleted: { id } })

    return true
  }

  // Field resolvers for optimized data fetching
  @ResolveField(() => [String])
  async posts(@Parent() user: User, @Context() context: GraphQLContext) {
    // Use DataLoader to avoid N+1 queries
    return context.dataSources.postLoader?.loadByUserId(user.id) || []
  }

  @ResolveField(() => Number)
  async postsCount(@Parent() user: User, @Context() context: GraphQLContext): Promise<number> {
    return context.dataSources.postLoader?.countByUserId(user.id) || 0
  }

  @ResolveField(() => String, { nullable: true })
  async lastLoginAt(@Parent() user: User): Promise<Date | null> {
    // This could be fetched from a separate service
    return this.userService.getLastLoginAt(user.id)
  }

  // Subscriptions
  @Subscription(() => User, { name: "userCreated" })
  userCreated() {
    return pubSub.asyncIterator("userCreated")
  }

  @Subscription(() => User, { name: "userUpdated" })
  userUpdated() {
    return pubSub.asyncIterator("userUpdated")
  }

  @Subscription(() => String, { name: "userDeleted" })
  userDeleted() {
    return pubSub.asyncIterator("userDeleted")
  }
}
