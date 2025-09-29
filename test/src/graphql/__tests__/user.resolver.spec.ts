import { Test, type TestingModule } from "@nestjs/testing"
import { jest } from "@jest/globals"

import { UserResolver } from "../modules/user/resolvers/user.resolver"
import { UserService } from "../modules/user/services/user.service"
import { UserLoader } from "../modules/user/loaders/user.loader"
import type { User } from "../modules/user/entities/user.entity"

describe("UserResolver", () => {
  let resolver: UserResolver
  let userService: jest.Mocked<UserService>
  let userLoader: jest.Mocked<UserLoader>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: UserLoader,
          useValue: {
            load: jest.fn(),
          },
        },
      ],
    }).compile()

    resolver = module.get<UserResolver>(UserResolver)
    userService = module.get(UserService)
    userLoader = module.get(UserLoader)
  })

  it("should be defined", () => {
    expect(resolver).toBeDefined()
  })

  describe("getUsers", () => {
    it("should return array of users", async () => {
      const mockUsers: User[] = [
        {
          id: "1",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          isActive: true,
          posts: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
      ]

      userService.findAll.mockResolvedValue(mockUsers)

      const result = await resolver.getUsers({ limit: 10, offset: 0 })

      expect(result).toEqual(mockUsers)
      expect(userService.findAll).toHaveBeenCalledWith({ limit: 10, offset: 0 })
    })
  })

  describe("getUser", () => {
    it("should return a user by id", async () => {
      const mockUser: User = {
        id: "1",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        isActive: true,
        posts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User

      userLoader.load.mockResolvedValue(mockUser)

      const result = await resolver.getUser("1")

      expect(result).toEqual(mockUser)
      expect(userLoader.load).toHaveBeenCalledWith("1")
    })
  })

  describe("createUser", () => {
    it("should create a new user", async () => {
      const input = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      }

      const mockUser: User = {
        id: "1",
        ...input,
        isActive: true,
        posts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User

      userService.create.mockResolvedValue(mockUser)

      const result = await resolver.createUser(input)

      expect(result).toEqual(mockUser)
      expect(userService.create).toHaveBeenCalledWith(input)
    })
  })
})
