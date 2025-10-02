import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  WALLET = 'wallet',
}

export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  DISCOVER = 'discover',
  JCB = 'jcb',
  DINERS_CLUB = 'diners_club',
  UNIONPAY = 'unionpay',
}

@Entity('payment_methods')
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  stripePaymentMethodId: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
  })
  type: PaymentMethodType;

  @Column({ nullable: true })
  cardBrand: CardBrand;

  @Column({ nullable: true })
  last4: string;

  @Column({ nullable: true })
  expMonth: number;

  @Column({ nullable: true })
  expYear: number;

  @Column({ nullable: true })
  fingerprint: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  funding: string;

  @Column({ nullable: true })
  wallet: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  routingNumber: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  accountHolderName: string;

  @Column({ nullable: true })
  accountHolderType: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  billingDetails: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
