import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payment_methods')
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar')
  type: string; // 'card', 'bank_account', 'wallet', etc.

  @Column('varchar')
  provider: string; // 'stripe', 'paypal', etc.

  @Column('varchar')
  externalId: string;

  @Column('varchar', { nullable: true })
  last4: string;

  @Column('varchar', { nullable: true })
  brand: string; // 'visa', 'mastercard', etc.

  @Column('timestamp', { nullable: true })
  expiresAt: Date;

  @Column('boolean', { default: false })
  isDefault: boolean;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
