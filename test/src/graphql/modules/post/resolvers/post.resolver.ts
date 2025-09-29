import { Resolver, Query, Mutation, Args, ResolveField, Parent, Context, Subscription } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { PubSub } from "graphql-subscriptions"
import { User } from "../../user/entities/user.entity"
import { Post } from "../entities/post.entity"
import type { PostService } from "../services/post.service"
import type { CreatePostInput } from "../dto/create-post.input"
import type { UpdatePostInput } from "../dto/update-post.input"
import type { PostsArgs } from "../dto/posts.args"
import { GqlAuthGuard } from "../../../guards/gql-auth.guard"
import { CurrentUser } from "../../../decorators/current-user.decorator"
import { CacheInterceptor } from "../../../interceptors/cache.interceptor"
import type { GraphQLContext } from "../../../types/context.type"

const pubSub = new PubSub()

@Resolver(() => Post)
export class PostResolver {
  constructor(private readonly postService: PostService) {}

  @Query(() => [Post], { name: "posts" })
  @UseInterceptors(CacheInterceptor)
  async getPosts(@Args() args: PostsArgs): Promise<Post[]> {
    return this.postService.findAll(args)
  }

  @Query(() => Post, { name: "post", nullable: true })
  @UseInterceptors(CacheInterceptor)
  async getPost(@Args("id") id: string): Promise<Post | null> {
    return this.postService.findById(id)
  }

  @Mutation(() => Post)
  @UseGuards(GqlAuthGuard)
  async createPost(@Args("input") input: CreatePostInput, @CurrentUser() user: User): Promise<Post> {
    const post = await this.postService.create(input, user)

    pubSub.publish("postCreated", { postCreated: post })

    return post
  }

  @Mutation(() => Post)
  @UseGuards(GqlAuthGuard)
  async updatePost(
    @Args("id") id: string,
    @Args("input") input: UpdatePostInput,
    @CurrentUser() user: User,
  ): Promise<Post> {
    const post = await this.postService.update(id, input, user)

    pubSub.publish("postUpdated", { postUpdated: post })

    return post
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deletePost(@Args("id") id: string, @CurrentUser() user: User): Promise<boolean> {
    await this.postService.delete(id, user)

    pubSub.publish("postDeleted", { postDeleted: { id } })

    return true
  }

  @Mutation(() => Post)
  async incrementPostViews(@Args("id") id: string): Promise<Post> {
    return this.postService.incrementViews(id)
  }

  // Field resolvers
  @ResolveField(() => User)
  async author(@Parent() post: Post, @Context() context: GraphQLContext) {
    return context.dataSources.userLoader?.load(post.authorId)
  }

  @ResolveField(() => Boolean)
  async isLikedByCurrentUser(@Parent() post: Post, @Context() context: GraphQLContext): Promise<boolean> {
    if (!context.user) return false
    return this.postService.isLikedByUser(post.id, context.user.id)
  }

  // Subscriptions
  @Subscription(() => Post, { name: "postCreated" })
  postCreated() {
    return pubSub.asyncIterator("postCreated")
  }

  @Subscription(() => Post, { name: "postUpdated" })
  postUpdated() {
    return pubSub.asyncIterator("postUpdated")
  }

  @Subscription(() => String, { name: "postDeleted" })
  postDeleted() {
    return pubSub.asyncIterator("postDeleted")
  }
}
