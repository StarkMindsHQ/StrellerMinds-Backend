#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SchemaAnalyzer {
  constructor() {
    this.entities = [];
    this.issues = {
      missingForeignKeys: [],
      missingIndexes: [],
      schemaDesignIssues: [],
      performanceIssues: [],
      dataIntegrityIssues: [],
    };
    this.recommendations = [];
  }

  async analyze() {
    console.log('🔍 Analyzing Database Schema...');
    console.log('================================');

    try {
      await this.scanEntities();
      await this.analyzeRelationships();
      await this.analyzeIndexes();
      await this.analyzeSchemaDesign();
      await this.analyzePerformanceIssues();
      await this.generateRecommendations();
      await this.generateReport();

      console.log('✅ Schema analysis completed!');
      this.printSummary();
    } catch (error) {
      console.error('❌ Error during schema analysis:', error.message);
      process.exit(1);
    }
  }

  async scanEntities() {
    console.log('📂 Scanning entity files...');

    const entityDirs = [
      'src/users/entities',
      'src/courses/entities',
      'src/auth/entities',
      'src/certificate/entity',
      'src/lesson/entity',
      'src/forum/entities',
      'src/post/entities',
      'src/topic/entities',
      'src/catogory/entities',
      'src/notification/entities',
      'src/language/entities',
    ];

    for (const dir of entityDirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath).filter((f) => f.endsWith('.entity.ts'));

        for (const file of files) {
          try {
            const entityPath = path.join(fullPath, file);
            const content = fs.readFileSync(entityPath, 'utf8');
            const entity = this.parseEntity(content, file);
            this.entities.push(entity);
          } catch (error) {
            console.warn(`⚠️  Could not parse entity ${file}:`, error.message);
          }
        }
      }
    }

    console.log(`   Found ${this.entities.length} entities`);
  }

  parseEntity(content, filename) {
    const entity = {
      name: filename.replace('.entity.ts', ''),
      file: filename,
      tableName: this.extractTableName(content),
      columns: this.extractColumns(content),
      relationships: this.extractRelationships(content),
      indexes: this.extractIndexes(content),
      constraints: this.extractConstraints(content),
    };

    return entity;
  }

  extractTableName(content) {
    const match = content.match(/@Entity\(['"`]([^'"`]+)['"`]\)/);
    return match ? match[1] : 'unknown';
  }

  extractColumns(content) {
    const columns = [];
    const columnRegex = /@Column\(([^)]*)\)\s*\n\s*([^:]+):\s*([^;]+);/g;
    let match;

    while ((match = columnRegex.exec(content)) !== null) {
      const options = match[1];
      const name = match[2].trim();
      const type = match[3].trim();

      columns.push({
        name,
        type,
        options: this.parseColumnOptions(options),
        hasIndex:
          content.includes(`@Index()`) && content.indexOf(`@Index()`) < content.indexOf(name),
      });
    }

    return columns;
  }

  extractRelationships(content) {
    const relationships = [];
    const relationshipTypes = ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'];

    relationshipTypes.forEach((type) => {
      const regex = new RegExp(`@${type}\\(([^)]+)\\)\\s*\\n\\s*([^:]+):\\s*([^;]+);`, 'g');
      let match;

      while ((match = regex.exec(content)) !== null) {
        relationships.push({
          type,
          property: match[2].trim(),
          targetType: match[3].trim(),
          options: match[1],
        });
      }
    });

    return relationships;
  }

  extractIndexes(content) {
    const indexes = [];
    const indexRegex = /@Index\(([^)]*)\)/g;
    let match;

    while ((match = indexRegex.exec(content)) !== null) {
      indexes.push({
        definition: match[1],
        type: 'custom',
      });
    }

    return indexes;
  }

  extractConstraints(content) {
    const constraints = [];

    // Check for unique constraints
    if (content.includes('unique: true')) {
      constraints.push({ type: 'unique' });
    }

    // Check for foreign key constraints
    if (content.includes('onDelete:') || content.includes('onUpdate:')) {
      constraints.push({ type: 'foreign_key' });
    }

    return constraints;
  }

  parseColumnOptions(optionsStr) {
    const options = {};

    if (optionsStr.includes('unique: true')) options.unique = true;
    if (optionsStr.includes('nullable: true')) options.nullable = true;
    if (optionsStr.includes('nullable: false')) options.nullable = false;
    if (optionsStr.includes('default:')) options.hasDefault = true;

    return options;
  }

  async analyzeRelationships() {
    console.log('🔗 Analyzing relationships and foreign keys...');

    this.entities.forEach((entity) => {
      entity.relationships.forEach((rel) => {
        // Check for missing foreign key constraints
        if (
          (rel.type === 'ManyToOne' || rel.type === 'OneToOne') &&
          !rel.options.includes('onDelete') &&
          !rel.options.includes('onUpdate')
        ) {
          this.issues.missingForeignKeys.push({
            entity: entity.name,
            relationship: rel.property,
            type: rel.type,
            issue: 'Missing onDelete/onUpdate cascade options',
          });
        }

        // Check for potential circular references
        if (rel.type === 'OneToOne' && !rel.options.includes('JoinColumn')) {
          this.issues.schemaDesignIssues.push({
            entity: entity.name,
            relationship: rel.property,
            issue: 'OneToOne relationship without JoinColumn specification',
          });
        }
      });
    });
  }

  async analyzeIndexes() {
    console.log('📊 Analyzing indexing strategy...');

    this.entities.forEach((entity) => {
      // Check for missing indexes on foreign keys
      entity.relationships.forEach((rel) => {
        if (rel.type === 'ManyToOne' || rel.type === 'OneToOne') {
          const hasIndex = entity.indexes.some(
            (idx) =>
              idx.definition.includes(rel.property) ||
              entity.columns.some((col) => col.name.includes(rel.property) && col.hasIndex),
          );

          if (!hasIndex) {
            this.issues.missingIndexes.push({
              entity: entity.name,
              column: rel.property,
              type: 'foreign_key',
              issue: 'Foreign key column without index',
            });
          }
        }
      });

      // Check for missing indexes on commonly queried fields
      const commonQueryFields = ['email', 'username', 'status', 'createdAt', 'updatedAt'];
      entity.columns.forEach((col) => {
        if (
          commonQueryFields.some((field) => col.name.toLowerCase().includes(field.toLowerCase())) &&
          !col.hasIndex &&
          !col.options.unique
        ) {
          this.issues.missingIndexes.push({
            entity: entity.name,
            column: col.name,
            type: 'query_optimization',
            issue: 'Commonly queried field without index',
          });
        }
      });
    });
  }

  async analyzeSchemaDesign() {
    console.log('🏗️  Analyzing schema design patterns...');

    this.entities.forEach((entity) => {
      // Check for missing audit fields
      const hasCreatedAt = entity.columns.some((col) => col.name === 'createdAt');
      const hasUpdatedAt = entity.columns.some((col) => col.name === 'updatedAt');

      if (!hasCreatedAt || !hasUpdatedAt) {
        this.issues.schemaDesignIssues.push({
          entity: entity.name,
          issue: 'Missing audit timestamp fields (createdAt/updatedAt)',
        });
      }

      // Check for potential normalization issues
      if (entity.columns.length > 20) {
        this.issues.schemaDesignIssues.push({
          entity: entity.name,
          issue: 'Large number of columns - consider normalization',
        });
      }

      // Check for missing soft delete support
      const hasSoftDelete = entity.columns.some((col) => col.name === 'deletedAt');
      if (!hasSoftDelete && entity.name !== 'audit' && entity.name !== 'log') {
        this.issues.schemaDesignIssues.push({
          entity: entity.name,
          issue: 'Missing soft delete support (deletedAt column)',
        });
      }
    });
  }

  async analyzePerformanceIssues() {
    console.log('⚡ Analyzing performance issues...');

    this.entities.forEach((entity) => {
      // Check for text/blob columns without length limits
      entity.columns.forEach((col) => {
        if (col.type.includes('text') && !col.options.length) {
          this.issues.performanceIssues.push({
            entity: entity.name,
            column: col.name,
            issue: 'Text column without length constraint',
          });
        }
      });

      // Check for missing composite indexes
      if (entity.relationships.length > 2) {
        this.issues.performanceIssues.push({
          entity: entity.name,
          issue: 'Multiple relationships - consider composite indexes',
        });
      }
    });
  }

  async generateRecommendations() {
    console.log('💡 Generating recommendations...');

    // Foreign key recommendations
    if (this.issues.missingForeignKeys.length > 0) {
      this.recommendations.push({
        category: 'Data Integrity',
        priority: 'HIGH',
        title: 'Add Foreign Key Constraints',
        description: 'Implement proper foreign key constraints with cascade options',
        count: this.issues.missingForeignKeys.length,
      });
    }

    // Index recommendations
    if (this.issues.missingIndexes.length > 0) {
      this.recommendations.push({
        category: 'Performance',
        priority: 'HIGH',
        title: 'Add Missing Indexes',
        description: 'Create indexes on foreign keys and commonly queried columns',
        count: this.issues.missingIndexes.length,
      });
    }

    // Schema design recommendations
    if (this.issues.schemaDesignIssues.length > 0) {
      this.recommendations.push({
        category: 'Schema Design',
        priority: 'MEDIUM',
        title: 'Improve Schema Design',
        description: 'Add audit fields, soft delete support, and proper constraints',
        count: this.issues.schemaDesignIssues.length,
      });
    }
  }

  async generateReport() {
    console.log('📋 Generating analysis report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEntities: this.entities.length,
        totalIssues: Object.values(this.issues).reduce((sum, arr) => sum + arr.length, 0),
        criticalIssues:
          this.issues.missingForeignKeys.length + this.issues.dataIntegrityIssues.length,
        performanceIssues: this.issues.missingIndexes.length + this.issues.performanceIssues.length,
      },
      entities: this.entities,
      issues: this.issues,
      recommendations: this.recommendations,
    };

    // Save detailed report
    const reportsDir = path.join(process.cwd(), 'docs', 'database', 'analysis');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `schema-analysis-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`   Report saved to: ${filepath}`);

    return report;
  }

  printSummary() {
    console.log('\n📊 SCHEMA ANALYSIS SUMMARY');
    console.log('===========================');
    console.log(`Total Entities Analyzed: ${this.entities.length}`);
    console.log(
      `Total Issues Found: ${Object.values(this.issues).reduce((sum, arr) => sum + arr.length, 0)}`,
    );
    console.log('');

    console.log('🔍 Issues by Category:');
    console.log(`  Missing Foreign Keys: ${this.issues.missingForeignKeys.length}`);
    console.log(`  Missing Indexes: ${this.issues.missingIndexes.length}`);
    console.log(`  Schema Design Issues: ${this.issues.schemaDesignIssues.length}`);
    console.log(`  Performance Issues: ${this.issues.performanceIssues.length}`);
    console.log(`  Data Integrity Issues: ${this.issues.dataIntegrityIssues.length}`);
    console.log('');

    console.log('💡 Top Recommendations:');
    this.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.title} (${rec.priority}) - ${rec.count} issues`);
    });

    if (this.issues.missingForeignKeys.length > 0) {
      console.log('\n⚠️  Critical Issues Found:');
      this.issues.missingForeignKeys.slice(0, 3).forEach((issue) => {
        console.log(`  - ${issue.entity}.${issue.relationship}: ${issue.issue}`);
      });
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new SchemaAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = SchemaAnalyzer;
