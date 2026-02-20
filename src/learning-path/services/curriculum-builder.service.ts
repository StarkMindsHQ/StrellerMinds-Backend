import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { LearningPath } from '../entities/learning-path.entity';
import { LearningPathNode } from '../entities/learning-path-node.entity';
import { NodeDependency, DependencyType } from '../entities/node-dependency.entity';
import { LearningObjective } from '../entities/learning-objective.entity';
import {
  CreateLearningPathDto,
  CreateNodeDto,
  CreateDependencyDto,
} from '../dto/create-learning-path.dto';
import { UpdateLearningPathDto } from '../dto/update-learning-path.dto';

@Injectable()
export class CurriculumBuilderService {
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

  async createLearningPath(
    userId: string,
    createDto: CreateLearningPathDto,
  ): Promise<LearningPath> {
    const learningPath = this.learningPathRepository.create({
      title: createDto.title,
      description: createDto.description,
      type: createDto.type,
      status: createDto.status,
      instructorId: userId,
      templateId: createDto.templateId,
      estimatedDurationHours: createDto.estimatedDurationHours,
      metadata: createDto.metadata,
      totalNodes: createDto.nodes?.length || 0,
    });

    const savedPath = await this.learningPathRepository.save(learningPath);

    // Create nodes if provided
    if (createDto.nodes && createDto.nodes.length > 0) {
      const nodes = await this.createNodes(savedPath.id, createDto.nodes);
      // Update the savedPath with nodes for return
      (savedPath as any).nodes = nodes;

      // Update total nodes count
      await this.learningPathRepository.update(savedPath.id, {
        totalNodes: nodes.length,
      });
    }

    return this.findOne(savedPath.id);
  }

  async createNodes(
    learningPathId: string,
    nodeDtos: CreateNodeDto[],
  ): Promise<LearningPathNode[]> {
    const nodes: LearningPathNode[] = [];

    // First, create all nodes without dependencies
    for (const dto of nodeDtos) {
      const node = this.nodeRepository.create({
        learningPathId,
        type: dto.type as any,
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        position: dto.position ?? nodes.length,
        estimatedDurationHours: dto.estimatedDurationHours,
        metadata: dto.metadata,
      });
      const savedNode = await this.nodeRepository.save(node);
      nodes.push(savedNode);
    }

    // Then, create dependencies
    for (let i = 0; i < nodeDtos.length; i++) {
      const dto = nodeDtos[i];
      const node = nodes[i];

      // Handle prerequisites
      if (dto.prerequisiteIds && dto.prerequisiteIds.length > 0) {
        const prerequisites = await this.nodeRepository.findByIds(dto.prerequisiteIds);
        node.prerequisites = prerequisites;
        await this.nodeRepository.save(node);
      }

      // Handle explicit dependencies
      if (dto.dependencies && dto.dependencies.length > 0) {
        for (const depDto of dto.dependencies) {
          await this.createDependency(node.id, depDto);
        }
      }
    }

    return nodes;
  }

  async createDependency(
    sourceNodeId: string,
    dependencyDto: CreateDependencyDto,
  ): Promise<NodeDependency> {
    const sourceNode = await this.nodeRepository.findOne({ where: { id: sourceNodeId } });
    const targetNode = await this.nodeRepository.findOne({
      where: { id: dependencyDto.targetNodeId },
    });

    if (!sourceNode || !targetNode) {
      throw new NotFoundException('Source or target node not found');
    }

    // Prevent circular dependencies
    if (await this.wouldCreateCycle(sourceNodeId, dependencyDto.targetNodeId)) {
      throw new BadRequestException('Cannot create circular dependency');
    }

    const dependency = this.dependencyRepository.create({
      sourceNodeId,
      targetNodeId: dependencyDto.targetNodeId,
      type: dependencyDto.type as DependencyType,
      conditions: dependencyDto.conditions || {},
    });

    return this.dependencyRepository.save(dependency);
  }

  async updateLearningPath(id: string, updateDto: UpdateLearningPathDto): Promise<LearningPath> {
    const learningPath = await this.learningPathRepository.findOne({
      where: { id },
      relations: ['nodes'],
    });

    if (!learningPath) {
      throw new NotFoundException(`Learning path with ID ${id} not found`);
    }

    Object.assign(learningPath, updateDto);

    if (updateDto.nodes) {
      learningPath.totalNodes = updateDto.nodes.length;
    }

    await this.learningPathRepository.save(learningPath);
    return this.findOne(id);
  }

  async findOne(id: string): Promise<LearningPath> {
    const learningPath = await this.learningPathRepository.findOne({
      where: { id },
      relations: [
        'nodes',
        'nodes.prerequisites',
        'nodes.outgoingDependencies',
        'nodes.incomingDependencies',
        'nodes.learningObjectives',
        'template',
        'instructor',
      ],
    });

    if (!learningPath) {
      throw new NotFoundException(`Learning path with ID ${id} not found`);
    }

    return learningPath;
  }

  async findAll(instructorId?: string): Promise<LearningPath[]> {
    const queryBuilder = this.learningPathRepository
      .createQueryBuilder('learningPath')
      .leftJoinAndSelect('learningPath.nodes', 'nodes')
      .leftJoinAndSelect('learningPath.template', 'template')
      .leftJoinAndSelect('learningPath.instructor', 'instructor')
      .orderBy('learningPath.createdAt', 'DESC');

    if (instructorId) {
      queryBuilder.where('learningPath.instructorId = :instructorId', { instructorId });
    }

    return queryBuilder.getMany();
  }

  async deleteLearningPath(id: string): Promise<void> {
    const result = await this.learningPathRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Learning path with ID ${id} not found`);
    }
  }

  async addNodeToPath(learningPathId: string, nodeDto: CreateNodeDto): Promise<LearningPathNode> {
    const learningPath = await this.learningPathRepository.findOne({
      where: { id: learningPathId },
    });
    if (!learningPath) {
      throw new NotFoundException(`Learning path with ID ${learningPathId} not found`);
    }

    const node = this.nodeRepository.create({
      learningPathId,
      type: nodeDto.type as any,
      courseId: nodeDto.courseId,
      title: nodeDto.title,
      description: nodeDto.description,
      position: nodeDto.position ?? learningPath.totalNodes,
      estimatedDurationHours: nodeDto.estimatedDurationHours,
      metadata: nodeDto.metadata,
    });

    const savedNode = await this.nodeRepository.save(node);

    // Update learning path total nodes count
    await this.learningPathRepository.update(learningPathId, {
      totalNodes: learningPath.totalNodes + 1,
    });

    return savedNode;
  }

  async removeNodeFromPath(nodeId: string): Promise<void> {
    const node = await this.nodeRepository.findOne({
      where: { id: nodeId },
      relations: ['learningPath'],
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${nodeId} not found`);
    }

    await this.nodeRepository.delete(nodeId);

    // Update learning path total nodes count
    await this.learningPathRepository.update(node.learningPathId, {
      totalNodes: () => 'totalNodes - 1',
    });
  }

  async getDependencyGraph(learningPathId: string): Promise<any> {
    const nodes = await this.nodeRepository.find({
      where: { learningPathId },
      relations: ['outgoingDependencies', 'incomingDependencies'],
    });

    const graph = {
      nodes: nodes.map((node) => ({
        id: node.id,
        title: node.title,
        type: node.type,
        position: node.position,
      })),
      edges: [],
    };

    // Add dependencies as edges
    for (const node of nodes) {
      for (const dependency of node.outgoingDependencies) {
        graph.edges.push({
          source: dependency.sourceNodeId,
          target: dependency.targetNodeId,
          type: dependency.type,
        });
      }
    }

    return graph;
  }

  async validateDependencies(
    learningPathId: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const nodes = await this.nodeRepository.find({
      where: { learningPathId },
      relations: ['outgoingDependencies', 'incomingDependencies'],
    });

    const errors: string[] = [];
    const visited = new Set<string>();

    // Check for cycles using DFS
    const hasCycle = (nodeId: string, path: string[]): boolean => {
      if (path.includes(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      const node = nodes.find((n) => n.id === nodeId);

      if (!node) return false;

      for (const dep of node.outgoingDependencies) {
        if (dep.type === DependencyType.PREREQUISITE || dep.type === DependencyType.UNLOCKS) {
          if (hasCycle(dep.targetNodeId, [...path, nodeId])) {
            errors.push(`Circular dependency detected: ${nodeId} -> ${dep.targetNodeId}`);
            return true;
          }
        }
      }

      return false;
    };

    // Check each node for cycles
    for (const node of nodes) {
      if (hasCycle(node.id, [])) {
        break;
      }
    }

    // Check for unreachable nodes (except the first one)
    const reachable = new Set<string>();
    const queue: string[] = [nodes[0]?.id].filter(Boolean);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (reachable.has(currentId)) continue;

      reachable.add(currentId);
      const node = nodes.find((n) => n.id === currentId);

      if (node) {
        for (const dep of node.outgoingDependencies) {
          if (!reachable.has(dep.targetNodeId)) {
            queue.push(dep.targetNodeId);
          }
        }
      }
    }

    const unreachableNodes = nodes.filter((node) => !reachable.has(node.id) && node.position !== 0);
    unreachableNodes.forEach((node) => {
      errors.push(`Unreachable node: ${node.title} (${node.id})`);
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async wouldCreateCycle(sourceId: string, targetId: string): Promise<boolean> {
    // Simple cycle detection: check if target can reach source
    const visited = new Set<string>();
    const queue: string[] = [targetId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      if (currentId === sourceId) return true;

      visited.add(currentId);

      const node = await this.nodeRepository.findOne({
        where: { id: currentId },
        relations: ['outgoingDependencies'],
      });

      if (node) {
        node.outgoingDependencies.forEach((dep) => {
          if (!visited.has(dep.targetNodeId)) {
            queue.push(dep.targetNodeId);
          }
        });
      }
    }

    return false;
  }
}
