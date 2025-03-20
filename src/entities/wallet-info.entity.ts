import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('wallet_info')
export class WalletInfo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    walletAddress: string;

    @Column({ nullable: true })
    balance: number;

    @ManyToOne(() => User, (user) => user.walletInfo, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    user: User;
}