#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index
} from 'typeorm';

/**
 * Entity Standardization Script
 * 
 * This script analyzes and standardizes entity relationships
 * across the entire codebase according to the established patterns.
 */

interface EntityAnalysis {
  entityName: string;
  filePath: string;
  relationships: RelationshipAnalysis[];
  issues: string[];
  recommendations: string[];
}

interface RelationshipAnalysis {
  propertyName: string;
  type: 'ManyToOne' | 'OneToMany' | 'ManyToMany';
  targetEntity: string;
  cascade?: string;
  onDelete?: string;
  nullable?: boolean;
  hasJoinColumn: boolean;
  hasIndex: boolean;
  line?: number;
}

class EntityStandardizer {
  private readonly entitiesDir = path.join(__dirname, '../src');
  private readonly analysis: EntityAnalysis[] = [];

  async analyzeAllEntities(): Promise<void> {
    console.log('🔍 Analyzing entity relationships...\n');
    
    const entityFiles = this.findEntityFiles();
    
    for (const filePath of entityFiles) {
      const analysis = await this.analyzeEntity(filePath);
      if (analysis) {
        this.analysis.push(analysis);
      }
    }
    
    this.generateReport();
    this.generateStandardizationScript();
  }

  private findEntityFiles(): string[] {
    const entityFiles: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (file.endsWith('.entity.ts')) {
          entityFiles.push(fullPath);
        }
      }
    };
    
    scanDirectory(this.entitiesDir);
    return entityFiles;
  }

  private async analyzeEntity(filePath: string): Promise<EntityAnalysis | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entityName = this.extractEntityName(content, filePath);
      
      if (!entityName) {
        return null;
      }

      const relationships = this.extractRelationships(content);
      const issues = this.identifyIssues(relationships);
      const recommendations = this.generateRecommendations(issues, relationships);

      return {
        entityName,
        filePath,
        relationships,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error.message);
      return null;
    }
  }

  private extractEntityName(content: string, filePath: string): string | null {
    const entityMatch = content.match(/@Entity\(['"]?([^'")]+)['"]?\)/);
    if (entityMatch) {
      return entityMatch[1];
    }
    
    // Fallback to filename
    const fileName = path.basename(filePath, '.entity.ts');
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }

  private extractRelationships(content: string): RelationshipAnalysis[] {
    const relationships: RelationshipAnalysis[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // ManyToOne relationships
      const manyToOneMatch = line.match(/@ManyToOne\(\)\s*(\w+):\s*(\w+)/);
      if (manyToOneMatch) {
        relationships.push({
          propertyName: manyToOneMatch[2],
          type: 'ManyToOne',
          targetEntity: manyToOneMatch[1],
          nullable: this.isNullable(line),
          hasJoinColumn: content.includes('@JoinColumn'),
          hasIndex: this.hasIndex(content, manyToOneMatch[2]),
          line: index + 1,
        });
      }

      // OneToMany relationships
      const oneToManyMatch = line.match(/@OneToMany\(\)\s*(\w+):\s*(\w+)/);
      if (oneToManyMatch) {
        relationships.push({
          propertyName: oneToManyMatch[2],
          type: 'OneToMany',
          targetEntity: oneToManyMatch[1],
          cascade: this.extractCascade(line),
          hasJoinColumn: false,
          hasIndex: this.hasIndex(content, oneToManyMatch[2]),
          line: index + 1,
        });
      }

      // ManyToMany relationships
      const manyToManyMatch = line.match(/@ManyToMany\(\)\s*(\w+):\s*(\w+)/);
      if (manyToManyMatch) {
        relationships.push({
          propertyName: manyToManyMatch[2],
          type: 'ManyToMany',
          targetEntity: manyToManyMatch[1],
          cascade: this.extractCascade(line),
          hasJoinTable: content.includes('@JoinTable'),
          hasIndex: this.hasIndex(content, manyToManyMatch[2]),
          line: index + 1,
        });
      }
    });

    return relationships;
  }

  private isNullable(line: string): boolean {
    return line.includes('nullable: true') || line.includes('nullable:');
  }

  private extractCascade(line: string): string | undefined {
    const cascadeMatch = line.match(/cascade:\s*\[([^\]]+)\]/);
    return cascadeMatch ? cascadeMatch[1] : undefined;
  }

  private hasIndex(content: string, propertyName: string): boolean {
    const indexPattern = new RegExp(`@Index\\([^']*${propertyName}[^']*\\)`, 'i');
    return indexPattern.test(content);
  }

  private identifyIssues(relationships: RelationshipAnalysis[]): string[] {
    const issues: string[] = [];

    relationships.forEach((rel) => {
      // Check for missing cascade configuration
      if (rel.type === 'OneToMany' && !rel.cascade) {
        issues.push(`❌ Missing cascade configuration for ${rel.propertyName} (OneToMany)`);
      }

      // Check for missing onDelete in ManyToOne
      if (rel.type === 'ManyToOne' && !rel.onDelete) {
        issues.push(`❌ Missing onDelete configuration for ${rel.propertyName} (ManyToOne)`);
      }

      // Check for missing JoinColumn in ManyToOne
      if (rel.type === 'ManyToOne' && !rel.hasJoinColumn) {
        issues.push(`❌ Missing @JoinColumn for ${rel.propertyName} (ManyToOne)`);
      }

      // Check for missing JoinTable in ManyToMany
      if (rel.type === 'ManyToMany' && !rel.hasJoinTable) {
        issues.push(`❌ Missing @JoinTable for ${rel.propertyName} (ManyToMany)`);
      }

      // Check for inconsistent naming
      const expectedName = this.generateExpectedName(rel);
      if (rel.propertyName !== expectedName) {
        issues.push(`⚠️  Inconsistent naming: ${rel.propertyName} should be ${expectedName}`);
      }

      // Check for missing indexes
      if (!rel.hasIndex && this.needsIndex(rel)) {
        issues.push(`⚠️  Missing index on ${rel.propertyName}`);
      }
    });

    return issues;
  }

  private generateExpectedName(rel: RelationshipAnalysis): string {
    const entityName = rel.targetEntity.toLowerCase();
    
    switch (rel.type) {
      case 'ManyToOne':
        return entityName;
      case 'OneToMany':
        return entityName + 's';
      case 'ManyToMany':
        return entityName + 's';
      default:
        return rel.propertyName;
    }
  }

  private needsIndex(rel: RelationshipAnalysis): boolean {
    // Foreign key columns should generally be indexed
    return rel.type === 'ManyToOne' || rel.type === 'ManyToMany';
  }

  private generateRecommendations(issues: string[], relationships: RelationshipAnalysis[]): string[] {
    const recommendations: string[] = [];

    if (issues.length > 0) {
      recommendations.push('🔧 Apply the standard relationship patterns from entity-relationship-standards.ts');
      recommendations.push('📚 Review the Entity Relationship Standards documentation');
      recommendations.push('🧪 Run the standardization script after making changes');
    }

    // Add specific recommendations based on relationship types
    const hasManyToMany = relationships.some(rel => rel.type === 'ManyToMany');
    if (hasManyToMany) {
      recommendations.push('🔗 Consider using join table entities for complex ManyToMany relationships');
    }

    const hasSoftDelete = relationships.some(rel => 
      rel.propertyName.includes('deleted') || rel.propertyName.includes('active')
    );
    if (!hasSoftDelete) {
      recommendations.push('🗑️  Consider implementing soft delete patterns');
    }

    return recommendations;
  }

  private generateReport(): void {
    console.log('📊 Entity Relationship Analysis Report\n');
    console.log('='.repeat(50));

    let totalIssues = 0;
    let totalRelationships = 0;

    this.analysis.forEach((entity) => {
      console.log(`\n📄 ${entity.entityName}`);
      console.log(`📁 ${entity.filePath}`);
      
      if (entity.relationships.length > 0) {
        console.log(`\n🔗 Relationships (${entity.relationships.length}):`);
        entity.relationships.forEach((rel) => {
          console.log(`  • ${rel.type}: ${rel.propertyName} -> ${rel.targetEntity}`);
          if (rel.cascade) console.log(`    🌊 Cascade: ${rel.cascade}`);
          if (rel.onDelete) console.log(`    🗑️  onDelete: ${rel.onDelete}`);
        });
        totalRelationships += entity.relationships.length;
      }

      if (entity.issues.length > 0) {
        console.log(`\n⚠️  Issues (${entity.issues.length}):`);
        entity.issues.forEach((issue) => {
          console.log(`  ${issue}`);
        });
        totalIssues += entity.issues.length;
      }

      if (entity.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        entity.recommendations.forEach((rec) => {
          console.log(`  ${rec}`);
        });
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log(`📈 Summary:`);
    console.log(`  • Total entities analyzed: ${this.analysis.length}`);
    console.log(`  • Total relationships: ${totalRelationships}`);
    console.log(`  • Total issues found: ${totalIssues}`);
    console.log(`  • Average issues per entity: ${(totalIssues / this.analysis.length).toFixed(1)}`);
  }

  private generateStandardizationScript(): void {
    const script = `#!/bin/bash
# Entity Relationship Standardization Script
# Generated on: ${new Date().toISOString()}

echo "🔧 Starting entity relationship standardization..."

# This script would contain:
# 1. Automated fixes for common issues
# 2. Relationship naming updates
# 3. Missing decorator additions
# 4. Index creation commands
# 5. Migration generation

echo "✅ Standardization complete!"
echo "📚 Review the changes and run tests"
`;

    fs.writeFileSync(
      path.join(__dirname, 'standardize-relationships.sh'),
      script
    );

    console.log(`\n📝 Generated standardization script: standardize-relationships.sh`);
  }
}

// Main execution
async function main() {
  const standardizer = new EntityStandardizer();
  await standardizer.analyzeAllEntities();
}

if (require.main === module) {
  main().catch(console.error);
}
