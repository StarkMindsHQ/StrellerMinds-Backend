import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserProgress } from './user-progress.entity';
import { WalletInfo } from './wallet-info.entity'; // Ensure this import is present
import * as bcrypt from 'bcrypt';
import { Role } from '../enums/userRole.enum'; // Adjust the import path as necessary

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: false })
  isInstructor: boolean;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ type: 'enum', enum: Role, default: Role.Student })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true }) // Ensure `isActive` is a column in the database
  isActive: boolean;

  @OneToMany(() => UserProgress, (progress) => progress.user)
  progress: UserProgress[]; // You can return it as a normal array if you're handling it directly in code

  @OneToOne(() => WalletInfo, (walletInfo) => walletInfo.user) // This defines the inverse relation
  walletInfo: WalletInfo;

  // Password handling
  async setPassword(password: string): Promise<void> {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(password, salt);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
