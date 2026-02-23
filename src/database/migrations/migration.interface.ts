export interface Migration {
  version: string;
  name: string;

  up(): Promise<void>;
  down(): Promise<void>;

  validate?(): Promise<void>;
}