#!/usr/bin/env ts-node

import { AppDataSource } from '../../config/typeorm.config';
import { SeedRunner, SeedDataSet, SeedOptions } from './seed.runner';

/**
 * CLI command to run database seeds
 * Usage:
 *   npm run seed                    # Run standard dataset
 *   npm run seed -- --reset         # Clear and reseed
 *   npm run seed -- --dataset=full  # Run full dataset
 */
async function main() {
    const args = process.argv.slice(2);

    // Parse command line arguments
    const options: SeedOptions = {
        dataSet: SeedDataSet.STANDARD,
        reset: false,
    };

    for (const arg of args) {
        if (arg === '--reset') {
            options.reset = true;
        } else if (arg.startsWith('--dataset=')) {
            const dataset = arg.split('=')[1] as SeedDataSet;
            if (Object.values(SeedDataSet).includes(dataset)) {
                options.dataSet = dataset;
            } else {
                console.error(`Invalid dataset: ${dataset}`);
                console.error(`Valid options: ${Object.values(SeedDataSet).join(', ')}`);
                process.exit(1);
            }
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    console.log('🚀 Initializing database connection...');

    try {
        // Initialize data source
        await AppDataSource.initialize();
        console.log('✅ Database connected successfully');

        // Run seeds
        const seedRunner = new SeedRunner(AppDataSource);
        await seedRunner.run(options);

        console.log('🎉 All done!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Error running seeds:', error);
        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

function printHelp() {
    console.log(`
Database Seed Command
=====================

Usage:
  npm run seed [options]

Options:
  --dataset=<type>    Dataset size to seed (minimal, standard, full)
                      Default: standard
  
  --reset             Clear existing data before seeding
                      WARNING: This will delete all data!
  
  --help, -h          Show this help message

Examples:
  npm run seed                      # Seed with standard dataset
  npm run seed -- --dataset=minimal # Seed with minimal dataset
  npm run seed -- --reset           # Clear and reseed
  npm run seed -- --dataset=full --reset  # Full reset and seed

Dataset Sizes:
  minimal   - 1 admin, 2 instructors, 5 students, 3 courses
  standard  - 1 admin, 5 instructors, 20 students, 15 courses
  full      - 1 admin, 10 instructors, 50 students, 30 courses
  `);
}

// Run the main function
main();
