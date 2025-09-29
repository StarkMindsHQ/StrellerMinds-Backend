import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import type { Repository } from "typeorm"

import type { User } from "../entities/user.entity"
import type { CreateUserInput } from "../dto/create-user.input"
import type { UpdateUserInput } from "../dto/update-user.input"
import type { UsersArgs } from "../dto/users.args"

@Injectable()
export class UserService {
  private readonly userRepository: Repository<User>

  constructor(userRepository: Repository<User>) {
    this.userRepository = userRepository
  }

  async findAll(args: UsersArgs): Promise<User[]> {
    const { limit = 20, offset = 0, search, isActive } = args

    const query = this.userRepository.createQueryBuilder("user")

    if (search) {
      query.andWhere("(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)", {
        search: `%${search}%`,
      })
    }

    if (isActive !== undefined) {
      query.andWhere("user.isActive = :isActive", { isActive })
    }

    return query.orderBy("user.createdAt", "DESC").limit(limit).offset(offset).getMany()
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } })
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.userRepository.findByIds(ids)
  }

  async create(input: CreateUserInput): Promise<User> {
    const user = this.userRepository.create(input)
    return this.userRepository.save(user)
  }

  async update(id: string, input: UpdateUserInput, currentUser: User): Promise<User> {
    const user = await this.findById(id)

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    // Authorization check
    if (user.id !== currentUser.id && !this.isAdmin(currentUser)) {
      throw new ForbiddenException("You can only update your own profile")
    }

    Object.assign(user, input)
    return this.userRepository.save(user)
  }

  async delete(id: string, currentUser: User): Promise<void> {
    const user = await this.findById(id)

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    // Authorization check
    if (user.id !== currentUser.id && !this.isAdmin(currentUser)) {
      throw new ForbiddenException("You can only delete your own profile")
    }

    await this.userRepository.remove(user)
  }

  async getLastLoginAt(userId: string): Promise<Date | null> {
    // This would typically fetch from a sessions table or cache
    // For now, return null as placeholder
    return null
  }

  private isAdmin(user: User): boolean {
    // Check if user has admin role
    return user.metadata?.roles?.includes("admin") || false
  }
}
