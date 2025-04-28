import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { Role } from './enums/userRole.enum';
// import { Role } from 'src/role/enums/userRole.enum';


@Injectable()
export class UsersService {
  private users: User[] = []; // In-memory users list for testing (can be removed in production)

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Create a new user with optional role assignment
  public async create(createUsersDto: CreateUsersDto): Promise<User> {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: createUsersDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Create user entity and hash the password
      const user = this.userRepository.create({
        ...createUsersDto,
        role: createUsersDto.role || Role.Student, // default to 'Student' if no role is passed
      });
      
      // Hash the password before saving
      await user.setPassword(createUsersDto.password);

      return await this.userRepository.save(user);
    } catch (error) {
      throw new InternalServerErrorException('Error creating user');
    }
  }

  // Fetch all users from DB
  public async findAll(): Promise<User[]> {
    try {
      return await this.userRepository.find();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  // Fetch user by their ID from DB
  public async findOne(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  // Fetch user by their email from DB
  public async findByEmail(email: string): Promise<User | undefined> {
    try {
      return await this.userRepository.findOne({ where: { email } });
    } catch (error) {
      throw new InternalServerErrorException('Error finding user by email');
    }
  }

  // Update user details (including role)
  public async update(id: string, updateUserDto: updateUsersDto): Promise<User> {
    try {
      const user = await this.findOne(id);
      await this.userRepository.update(id, updateUserDto);
      return await this.findOne(id);
    } catch (error) {
      throw new InternalServerErrorException('Error updating user');
    }
  }

  // Update user role by ID
  public async updateRole(id: string, role: Role): Promise<User> {
    try {
      const user = await this.findOne(id);
      user.role = role;
      return await this.userRepository.save(user);
    } catch (error) {
      throw new InternalServerErrorException('Error updating user role');
    }
  }

  // Delete a user by ID
  public async delete(id: string): Promise<void> {
    try {
      const result = await this.userRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    } catch (error) {
      throw new InternalServerErrorException('Error deleting user');
    }
  }

  // Mock function to find user by email in-memory (for testing only)
  findByEmailInMemory(email: string): User | undefined {
    return this.users.find(u => u.email === email);
  }

  // Mock function to update user role in-memory (for testing only)
  updateRoleInMemory(id: string, role: Role): User | undefined {
    const user = this.users.find(u => u.id === id);
    if (user) user.role = role;
    return user;
  }

  // Mock function to find all users in-memory (for testing only)
  findAllInMemory() {
    return this.users;
  }
}
