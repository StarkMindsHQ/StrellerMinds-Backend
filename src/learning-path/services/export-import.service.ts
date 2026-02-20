import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPath } from '../entities/learning-path.entity';
import { LearningPathNode } from '../entities/learning-path-node.entity';
import { NodeDependency } from '../entities/node-dependency.entity';
import { LearningObjective } from '../entities/learning-objective.entity';

export interface ExportFormat {
  format: string;
  version: string;
  exportedAt: Date;
  learningPath: {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    estimatedDurationHours: number;
    totalNodes: number;
    metadata: Record<string, any>;
    nodes: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      position: number;
      estimatedDurationHours: number;
      courseId?: string;
      metadata: Record<string, any>;
      prerequisites: string[];
      dependencies: Array<{
        targetNodeId: string;
        type: string;
        conditions: Record<string, any>;
      }>;
      objectives: Array<{
        id: string;
        title: string;
        description: string;
        type: string;
        difficulty: string;
        domain: string;
      }>;
    }>;
  };
}

@Injectable()
export class ExportImportService {
  constructor(
    @InjectRepository(LearningPath)
    private readonly learningPathRepository: Repository<LearningPath>,
    @InjectRepository(LearningPathNode)
    private readonly nodeRepository: Repository<LearningPathNode>,
    @InjectRepository(NodeDependency)
    private readonly dependencyRepository: Repository<NodeDependency>,
    @InjectRepository(LearningObjective)
    private readonly objectiveRepository: Repository<LearningObjective>,
  ) {}

  async exportLearningPath(learningPathId: string): Promise<ExportFormat> {
    const learningPath = await this.learningPathRepository.findOne({
      where: { id: learningPathId },
      relations: [
        'nodes',
        'nodes.prerequisites',
        'nodes.outgoingDependencies',
        'nodes.learningObjectives',
      ],
    });

    if (!learningPath) {
      throw new NotFoundException(`Learning path with ID ${learningPathId} not found`);
    }

    const exportData: ExportFormat = {
      format: 'streller-learning-path',
      version: '1.0',
      exportedAt: new Date(),
      learningPath: {
        id: learningPath.id,
        title: learningPath.title,
        description: learningPath.description || '',
        type: learningPath.type,
        status: learningPath.status,
        estimatedDurationHours: learningPath.estimatedDurationHours,
        totalNodes: learningPath.totalNodes,
        metadata: learningPath.metadata,
        nodes: learningPath.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          title: node.title,
          description: node.description || '',
          position: node.position,
          estimatedDurationHours: node.estimatedDurationHours,
          courseId: node.courseId,
          metadata: node.metadata,
          prerequisites: node.prerequisites.map((p) => p.id),
          dependencies: node.outgoingDependencies.map((dep) => ({
            targetNodeId: dep.targetNodeId,
            type: dep.type,
            conditions: dep.conditions,
          })),
          objectives: node.learningObjectives.map((obj) => ({
            id: obj.id,
            title: obj.title,
            description: obj.description,
            type: obj.type,
            difficulty: obj.difficulty,
            domain: obj.domain,
          })),
        })),
      },
    };

    return exportData;
  }

  async importLearningPath(userId: string, importData: ExportFormat): Promise<LearningPath> {
    // Validate import format
    if (importData.format !== 'streller-learning-path') {
      throw new Error('Unsupported import format');
    }

    // Create new learning path
    const learningPath = this.learningPathRepository.create({
      title: importData.learningPath.title,
      description: importData.learningPath.description,
      type: importData.learningPath.type as any,
      status: 'draft' as any,
      instructorId: userId,
      estimatedDurationHours: importData.learningPath.estimatedDurationHours,
      totalNodes: importData.learningPath.totalNodes,
      metadata: {
        ...importData.learningPath.metadata,
        importedFrom: importData.learningPath.id,
        importTimestamp: new Date(),
      },
    });

    const savedPath = await this.learningPathRepository.save(learningPath);

    // Create nodes
    const nodeIdMap = new Map<string, string>(); // oldId -> newId mapping

    // First pass: create all nodes
    for (const nodeData of importData.learningPath.nodes) {
      const node = this.nodeRepository.create({
        learningPathId: savedPath.id,
        type: nodeData.type as any,
        title: nodeData.title,
        description: nodeData.description,
        position: nodeData.position,
        estimatedDurationHours: nodeData.estimatedDurationHours,
        courseId: nodeData.courseId,
        metadata: nodeData.metadata,
      });

      const savedNode = await this.nodeRepository.save(node);
      nodeIdMap.set(nodeData.id, savedNode.id);
    }

    // Second pass: create dependencies and objectives
    for (const nodeData of importData.learningPath.nodes) {
      const newNodeId = nodeIdMap.get(nodeData.id)!;
      const node = await this.nodeRepository.findOne({
        where: { id: newNodeId },
        relations: ['prerequisites', 'outgoingDependencies', 'learningObjectives'],
      });

      if (!node) continue;

      // Handle prerequisites
      if (nodeData.prerequisites.length > 0) {
        const prerequisiteIds = nodeData.prerequisites
          .map((oldId) => nodeIdMap.get(oldId))
          .filter(Boolean) as string[];

        if (prerequisiteIds.length > 0) {
          const prerequisites = await this.nodeRepository.findByIds(prerequisiteIds);
          node.prerequisites = prerequisites;
        }
      }

      // Handle dependencies
      for (const depData of nodeData.dependencies) {
        const targetNewId = nodeIdMap.get(depData.targetNodeId);
        if (targetNewId) {
          const dependency = this.dependencyRepository.create({
            sourceNodeId: newNodeId,
            targetNodeId: targetNewId,
            type: depData.type as any,
            conditions: depData.conditions,
          });
          await this.dependencyRepository.save(dependency);
        }
      }

      // Handle objectives - create or find existing ones
      for (const objData of nodeData.objectives) {
        let objective = await this.objectiveRepository.findOne({
          where: {
            title: objData.title,
            domain: objData.domain,
          },
        });

        if (!objective) {
          objective = this.objectiveRepository.create({
            title: objData.title,
            description: objData.description,
            type: objData.type as any,
            difficulty: objData.difficulty as any,
            domain: objData.domain,
          });
          objective = await this.objectiveRepository.save(objective);
        }

        if (!node.learningObjectives) {
          node.learningObjectives = [];
        }
        node.learningObjectives.push(objective);
      }

      await this.nodeRepository.save(node);
    }

    return this.learningPathRepository.findOne({
      where: { id: savedPath.id },
      relations: ['nodes'],
    }) as Promise<LearningPath>;
  }

  async exportTemplate(learningPathId: string): Promise<any> {
    const exportData = await this.exportLearningPath(learningPathId);

    // Convert to template format
    const templateData = {
      name: `Template: ${exportData.learningPath.title}`,
      description: exportData.learningPath.description,
      category: 'skill_path',
      isPublic: false,
      structure: {
        nodes: exportData.learningPath.nodes.map((node) => ({
          type: node.type,
          title: node.title,
          description: node.description,
          position: node.position,
          estimatedDurationHours: node.estimatedDurationHours,
          dependencies: node.dependencies
            .map((dep) => ({
              targetPosition: exportData.learningPath.nodes.find((n) => n.id === dep.targetNodeId)
                ?.position,
              type: dep.type,
              conditions: dep.conditions,
            }))
            .filter((dep) => dep.targetPosition !== undefined),
        })),
      },
      estimatedDurationHours: exportData.learningPath.estimatedDurationHours,
      metadata: {
        sourceLearningPathId: exportData.learningPath.id,
        exportTimestamp: exportData.exportedAt,
      },
    };

    return templateData;
  }
}
