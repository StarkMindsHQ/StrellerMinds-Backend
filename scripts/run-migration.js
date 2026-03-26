const { DataSource } = require('typeorm');
const path = require('path');
require('dotenv').config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'strellerminds',
  
  entities: [path.join(__dirname, '..', 'dist', 'src', '**', '*.entity.js')],
  migrations: [path.join(__dirname, '..', 'src', 'database', 'migrations', '*.ts')],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
});

async function runMigration() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');
    
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully');
    
    await AppDataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
