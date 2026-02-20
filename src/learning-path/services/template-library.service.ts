import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LearningPathTemplate, TemplateCategory } from '../entities/learning-path-template.entity';
import { LearningPath } from '../entities/learning-path.entity';
import { LearningPathNode } from '../entities/learning-path-node.entity';

export interface TemplateStructure {
  name: string;
  description: string;
  category: TemplateCategory;
  nodes: Array<{
    type: string;
    title: string;
    description?: string;
    estimatedDurationHours?: number;
    position: number;
    dependencies?: Array<{
      targetPosition: number;
      type: string;
      conditions?: Record<string, any>;
    }>;
  }>;
  metadata?: Record<string, any>;
}

@Injectable()
export class TemplateLibraryService {
  constructor(
    @InjectRepository(LearningPathTemplate)
    private readonly templateRepository: Repository<LearningPathTemplate>,
    @InjectRepository(LearningPath)
    private readonly learningPathRepository: Repository<LearningPath>,
    @InjectRepository(LearningPathNode)
    private readonly nodeRepository: Repository<LearningPathNode>,
  ) {}

  async createTemplate(userId: string, templateDto: any): Promise<LearningPathTemplate> {
    // Validate template structure
    this.validateTemplateStructure(templateDto.structure);

    const template = this.templateRepository.create({
      name: templateDto.name,
      description: templateDto.description,
      category: templateDto.category,
      isPublic: templateDto.isPublic ?? false,
      createdBy: userId,
      structure: templateDto.structure,
      tags: templateDto.tags,
      estimatedDurationHours: templateDto.estimatedDurationHours,
      metadata: templateDto.metadata,
    });

    const savedTemplate = await this.templateRepository.save(template);

    // Update usage count if this is based on an existing learning path
    if (templateDto.basedOnLearningPathId) {
      await this.updateTemplateFromLearningPath(
        savedTemplate.id,
        templateDto.basedOnLearningPathId,
      );
    }

    return savedTemplate;
  }

  async findAll(category?: TemplateCategory, search?: string): Promise<LearningPathTemplate[]> {
    const queryBuilder = this.templateRepository.createQueryBuilder('template');

    if (category) {
      queryBuilder.andWhere('template.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search OR template.tags::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Show public templates and user's own templates
    queryBuilder.andWhere('(template.isPublic = true OR template.createdBy = :userId)', {
      userId: 'current_user_id', // This would be replaced with actual user ID in controller
    });

    return queryBuilder
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<LearningPathTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async updateTemplate(id: string, updateDto: any): Promise<LearningPathTemplate> {
    const template = await this.findOne(id);

    if (updateDto.structure) {
      this.validateTemplateStructure(updateDto.structure);
    }

    Object.assign(template, updateDto);
    return this.templateRepository.save(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const result = await this.templateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
  }

  async instantiateTemplate(
    templateId: string,
    userId: string,
    customizations?: any,
  ): Promise<LearningPath> {
    const template = await this.findOne(templateId);

    // Create new learning path based on template
    const learningPath = this.learningPathRepository.create({
      title: customizations?.title || `Copy of ${template.name}`,
      description: customizations?.description || template.description,
      type: customizations?.type || 'linear',
      status: 'draft' as any,
      instructorId: userId,
      templateId: template.id,
      estimatedDurationHours: template.estimatedDurationHours,
      metadata: {
        ...template.metadata,
        instantiatedFromTemplate: template.id,
        templateVersion: template.updatedAt,
        ...customizations?.metadata,
      },
      totalNodes: 0, // Will be updated when nodes are created
    });

    const savedPath = await this.learningPathRepository.save(learningPath);

    // Create nodes based on template structure
    if (template.structure && template.structure.nodes) {
      await this.createNodesFromTemplateStructure(
        savedPath.id,
        template.structure.nodes,
        customizations,
      );
    }

    // Increment usage count
    await this.templateRepository.update(templateId, {
      usageCount: () => 'usageCount + 1',
    });

    return this.learningPathRepository.findOne({
      where: { id: savedPath.id },
      relations: ['nodes'],
    }) as Promise<LearningPath>;
  }

  private async createNodesFromTemplateStructure(
    learningPathId: string,
    templateNodes: any[],
    customizations?: any,
  ): Promise<void> {
    // Create all nodes first
    const createdNodes: LearningPathNode[] = [];

    for (const templateNode of templateNodes) {
      const node = this.nodeRepository.create({
        learningPathId,
        type: templateNode.type,
        title: customizations?.nodeTitles?.[templateNode.position] || templateNode.title,
        description: templateNode.description,
        position: templateNode.position,
        estimatedDurationHours: templateNode.estimatedDurationHours,
        metadata: templateNode.metadata || {},
      });

      const savedNode = await this.nodeRepository.save(node);
      createdNodes.push(savedNode);
    }

    // Create dependencies between nodes
    for (const templateNode of templateNodes) {
      if (templateNode.dependencies && templateNode.dependencies.length > 0) {
        const sourceNode = createdNodes.find((n) => n.position === templateNode.position);

        for (const dep of templateNode.dependencies) {
          const targetNode = createdNodes.find((n) => n.position === dep.targetPosition);

          if (sourceNode && targetNode) {
            // Create dependency record (this would require a dependency entity/repository)
            console.log(`Creating dependency from node ${sourceNode.id} to ${targetNode.id}`);
          }
        }
      }
    }
  }

  private validateTemplateStructure(structure: any): void {
    if (!structure || !structure.nodes || !Array.isArray(structure.nodes)) {
      throw new BadRequestException('Template structure must include a nodes array');
    }

    // Validate each node
    for (const node of structure.nodes) {
      if (!node.type || !node.title || typeof node.position !== 'number') {
        throw new BadRequestException('Each node must have type, title, and position');
      }

      // Validate dependencies if present
      if (node.dependencies) {
        for (const dep of node.dependencies) {
          if (typeof dep.targetPosition !== 'number' || !dep.type) {
            throw new BadRequestException('Invalid dependency structure');
          }
        }
      }
    }

    // Check for circular dependencies would go here
  }

  async getPopularTemplates(limit: number = 10): Promise<LearningPathTemplate[]> {
    return this.templateRepository
      .createQueryBuilder('template')
      .where('template.isPublic = true')
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getTemplatesByCategory(category: TemplateCategory): Promise<LearningPathTemplate[]> {
    return this.templateRepository.find({
      where: { category, isPublic: true },
      order: { usageCount: 'DESC' },
    });
  }

  async searchTemplates(query: string): Promise<LearningPathTemplate[]> {
    return this.templateRepository
      .createQueryBuilder('template')
      .where('template.isPublic = true')
      .andWhere(
        '(template.name ILIKE :query OR template.description ILIKE :query OR template.tags::text ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('template.usageCount', 'DESC')
      .getMany();
  }

  async getUserTemplates(userId: string): Promise<LearningPathTemplate[]> {
    return this.templateRepository.find({
      where: { createdBy: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async incrementUsageCount(templateId: string): Promise<void> {
    await this.templateRepository.update(templateId, {
      usageCount: () => 'usageCount + 1',
    });
  }

  async getTemplateStatistics(): Promise<any> {
    const totalTemplates = await this.templateRepository.count();
    const publicTemplates = await this.templateRepository.count({ where: { isPublic: true } });
    const privateTemplates = totalTemplates - publicTemplates;

    const categoryStats = await this.templateRepository
      .createQueryBuilder('template')
      .select('template.category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('template.category')
      .getRawMany();

    const topTemplates = await this.templateRepository
      .createQueryBuilder('template')
      .where('template.isPublic = true')
      .orderBy('template.usageCount', 'DESC')
      .limit(5)
      .getMany();

    return {
      total: totalTemplates,
      public: publicTemplates,
      private: privateTemplates,
      byCategory: categoryStats.reduce(
        (acc, stat) => {
          acc[stat.category] = parseInt(stat.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      topTemplates: topTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        usageCount: t.usageCount,
      })),
    };
  }

  private async updateTemplateFromLearningPath(
    templateId: string,
    learningPathId: string,
  ): Promise<void> {
    const learningPath = await this.learningPathRepository.findOne({
      where: { id: learningPathId },
      relations: ['nodes'],
    });

    if (!learningPath) {
      throw new NotFoundException(`Learning path with ID ${learningPathId} not found`);
    }

    // Convert learning path structure to template structure
    const structure: any = {
      name: learningPath.title,
      description: learningPath.description || '',
      category: 'skill_path', // Default category
      nodes: learningPath.nodes.map((node) => ({
        type: node.type,
        title: node.title,
        description: node.description || '',
        estimatedDurationHours: node.estimatedDurationHours,
        position: node.position,
        dependencies: [], // Would need to fetch actual dependencies
      })),
      metadata: {
        sourceLearningPathId: learningPathId,
        nodeCount: learningPath.nodes.length,
        estimatedTotalHours: learningPath.estimatedDurationHours,
      },
    };

    await this.templateRepository.update(templateId, {
      structure: structure as any,
      estimatedDurationHours: learningPath.estimatedDurationHours,
    });
  }

  async createStandardTemplates(): Promise<void> {
    const standardTemplates: Partial<LearningPathTemplate>[] = [
      {
        name: 'Full-Stack Developer Bootcamp',
        description: 'Comprehensive path to become a full-stack developer',
        category: TemplateCategory.BOOTCAMP,
        isPublic: true,
        structure: {
          nodes: [
            {
              type: 'course',
              title: 'HTML & CSS Fundamentals',
              position: 0,
              estimatedDurationHours: 20,
            },
            {
              type: 'course',
              title: 'JavaScript Essentials',
              position: 1,
              estimatedDurationHours: 30,
              dependencies: [{ targetPosition: 0, type: 'prerequisite' }],
            },
            {
              type: 'course',
              title: 'React Frontend Development',
              position: 2,
              estimatedDurationHours: 35,
              dependencies: [{ targetPosition: 1, type: 'prerequisite' }],
            },
            {
              type: 'course',
              title: 'Node.js Backend Development',
              position: 3,
              estimatedDurationHours: 40,
              dependencies: [{ targetPosition: 1, type: 'prerequisite' }],
            },
            {
              type: 'project',
              title: 'Full-Stack Capstone Project',
              position: 4,
              estimatedDurationHours: 50,
              dependencies: [
                { targetPosition: 2, type: 'prerequisite' },
                { targetPosition: 3, type: 'prerequisite' },
              ],
            },
          ],
        },
        estimatedDurationHours: 175,
      },
      {
        name: 'Data Science Foundation',
        description: 'Beginner path to data science and machine learning',
        category: TemplateCategory.FOUNDATION,
        isPublic: true,
        structure: {
          nodes: [
            {
              type: 'course',
              title: 'Python Programming',
              position: 0,
              estimatedDurationHours: 25,
            },
            {
              type: 'course',
              title: 'Statistics and Probability',
              position: 1,
              estimatedDurationHours: 30,
            },
            {
              type: 'course',
              title: 'Data Analysis with Pandas',
              position: 2,
              estimatedDurationHours: 20,
              dependencies: [
                { targetPosition: 0, type: 'prerequisite' },
                { targetPosition: 1, type: 'prerequisite' },
              ],
            },
            {
              type: 'course',
              title: 'Machine Learning Basics',
              position: 3,
              estimatedDurationHours: 35,
              dependencies: [{ targetPosition: 2, type: 'prerequisite' }],
            },
          ],
        },
        estimatedDurationHours: 110,
      },
    ];

    for (const template of standardTemplates) {
      await this.templateRepository.save(template);
    }
  }
}
