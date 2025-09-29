import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentEntity } from './payment.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

export enum InvoiceType {
  INVOICE = 'invoice',
  CREDIT_NOTE = 'credit_note',
  DEBIT_NOTE = 'debit_note',
}

@Entity('invoices')
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  paymentId: string;

  @Column()
  stripeInvoiceId: string;

  @Column()
  invoiceNumber: string;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({
    type: 'enum',
    enum: InvoiceType,
    default: InvoiceType.INVOICE,
  })
  type: InvoiceType;

  @Column()
  amount: number; // Amount in cents

  @Column()
  currency: string;

  @Column({ nullable: true })
  taxAmount: number;

  @Column({ nullable: true })
  discountAmount: number;

  @Column({ nullable: true })
  subtotal: number;

  @Column({ nullable: true })
  total: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }>;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  billingAddress: string;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  voidedAt: Date;

  @Column({ nullable: true })
  voidReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  terms: string;

  @Column({ nullable: true })
  footer: string;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ nullable: true })
  hostedInvoiceUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => PaymentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment: PaymentEntity;
} 