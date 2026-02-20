import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  LearningObjective,
  ObjectiveType,
  DifficultyLevel,
} from '../entities/learning-objective.entity';
import { LearningPathNode } from '../entities/learning-path-node.entity';
import { Course } from '../../course/entities/course.entity';

export interface ObjectiveCoverageReport {
  objectiveId: string;
  title: string;
  coverage: number; // 0-1 scale
  mappedNodes: string[];
  gaps: string[];
}

export interface AlignmentAnalysis {
  courseId: string;
  courseTitle: string;
  objectivesCovered: string[];
  objectivesMissing: string[];
  alignmentScore: number; // 0-1 scale
}

@Injectable()
export class ObjectiveMappingService {
  constructor(
    @InjectRepository(LearningObjective)
    private readonly objectiveRepository: Repository<LearningObjective>,
    @InjectRepository(LearningPathNode)
    private readonly nodeRepository: Repository<LearningPathNode>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async createObjective(createDto: any): Promise<LearningObjective> {
    const objective = this.objectiveRepository.create({
      title: createDto.title,
      description: createDto.description,
      type: createDto.type,
      difficulty: createDto.difficulty,
      domain: createDto.domain,
      bloomTaxonomyLevel: createDto.bloomTaxonomyLevel,
      keywords: createDto.keywords,
      metadata: createDto.metadata,
    });
    return this.objectiveRepository.save(objective);
  }

  async updateObjective(id: string, updateDto: any): Promise<LearningObjective> {
    const objective = await this.objectiveRepository.findOne({ where: { id } });
    if (!objective) {
      throw new NotFoundException(`Learning objective with ID ${id} not found`);
    }

    Object.assign(objective, updateDto);
    return this.objectiveRepository.save(objective);
  }

  async deleteObjective(id: string): Promise<void> {
    const result = await this.objectiveRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Learning objective with ID ${id} not found`);
    }
  }

  async findOne(id: string): Promise<LearningObjective> {
    const objective = await this.objectiveRepository.findOne({ where: { id } });
    if (!objective) {
      throw new NotFoundException(`Learning objective with ID ${id} not found`);
    }
    return objective;
  }

  async findAll(filters?: {
    type?: ObjectiveType;
    difficulty?: DifficultyLevel;
    domain?: string;
    search?: string;
  }): Promise<LearningObjective[]> {
    const queryBuilder = this.objectiveRepository.createQueryBuilder('objective');

    if (filters?.type) {
      queryBuilder.andWhere('objective.type = :type', { type: filters.type });
    }

    if (filters?.difficulty) {
      queryBuilder.andWhere('objective.difficulty = :difficulty', {
        difficulty: filters.difficulty,
      });
    }

    if (filters?.domain) {
      queryBuilder.andWhere('objective.domain = :domain', { domain: filters.domain });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(objective.title ILIKE :search OR objective.description ILIKE :search OR objective.keywords::text ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return queryBuilder.orderBy('objective.createdAt', 'DESC').getMany();
  }

  async mapObjectivesToNode(nodeId: string, objectiveIds: string[]): Promise<void> {
    const node = await this.nodeRepository.findOne({
      where: { id: nodeId },
      relations: ['learningObjectives'],
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${nodeId} not found`);
    }

    const objectives = await this.objectiveRepository.findByIds(objectiveIds);
    if (objectives.length !== objectiveIds.length) {
      throw new NotFoundException('One or more objectives not found');
    }

    node.learningObjectives = objectives;
    await this.nodeRepository.save(node);
  }

  async removeObjectivesFromNode(nodeId: string, objectiveIds: string[]): Promise<void> {
    const node = await this.nodeRepository.findOne({
      where: { id: nodeId },
      relations: ['learningObjectives'],
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${nodeId} not found`);
    }

    node.learningObjectives = node.learningObjectives.filter(
      (obj) => !objectiveIds.includes(obj.id),
    );

    await this.nodeRepository.save(node);
  }

  async getNodeObjectives(nodeId: string): Promise<LearningObjective[]> {
    const node = await this.nodeRepository.findOne({
      where: { id: nodeId },
      relations: ['learningObjectives'],
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${nodeId} not found`);
    }

    return node.learningObjectives;
  }

  async getObjectiveCoverageReport(learningPathId: string): Promise<ObjectiveCoverageReport[]> {
    const nodes = await this.nodeRepository.find({
      where: { learningPathId },
      relations: ['learningObjectives'],
    });

    // Get all unique objectives across all nodes
    const allObjectives = new Map<string, LearningObjective>();
    const objectiveNodeMap = new Map<string, string[]>();

    for (const node of nodes) {
      for (const objective of node.learningObjectives) {
        allObjectives.set(objective.id, objective);

        if (!objectiveNodeMap.has(objective.id)) {
          objectiveNodeMap.set(objective.id, []);
        }
        objectiveNodeMap.get(objective.id)!.push(node.id);
      }
    }

    // Calculate coverage for each objective
    const totalNodes = nodes.length;
    const reports: ObjectiveCoverageReport[] = [];

    for (const [objId, objective] of allObjectives) {
      const mappedNodes = objectiveNodeMap.get(objId) || [];
      const coverage = totalNodes > 0 ? mappedNodes.length / totalNodes : 0;

      reports.push({
        objectiveId: objId,
        title: objective.title,
        coverage,
        mappedNodes,
        gaps: nodes.filter((node) => !mappedNodes.includes(node.id)).map((node) => node.id),
      });
    }

    return reports.sort((a, b) => b.coverage - a.coverage);
  }

  async analyzeCourseAlignment(courseId: string): Promise<AlignmentAnalysis> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['modules', 'modules.lessons'],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Get objectives from course metadata or associated learning paths
    const courseObjectives = await this.extractCourseObjectives(course);

    // Find learning paths that include this course
    const nodesWithCourse = await this.nodeRepository.find({
      where: { courseId },
      relations: ['learningObjectives', 'learningPath'],
    });

    const pathObjectives = new Set<string>();
    nodesWithCourse.forEach((node) => {
      node.learningObjectives.forEach((obj) => pathObjectives.add(obj.id));
    });

    const coveredObjectives = courseObjectives.filter((objId) => pathObjectives.has(objId));
    const missingObjectives = courseObjectives.filter((objId) => !pathObjectives.has(objId));

    const alignmentScore =
      courseObjectives.length > 0 ? coveredObjectives.length / courseObjectives.length : 1;

    return {
      courseId: course.id,
      courseTitle: course.title,
      objectivesCovered: coveredObjectives,
      objectivesMissing: missingObjectives,
      alignmentScore,
    };
  }

  private async extractCourseObjectives(course: Course): Promise<string[]> {
    // Extract objectives from course description using NLP-like approach
    const objectives: string[] = [];

    // Extract from course description using NLP-like approach
    const descriptionKeywords = this.extractKeywordsFromText(course.description);
    const matchingObjectives = await this.objectiveRepository
      .createQueryBuilder('objective')
      .where('objective.keywords && :keywords', { keywords: descriptionKeywords })
      .getMany();

    objectives.push(...matchingObjectives.map((obj) => obj.id));

    return [...new Set(objectives)]; // Remove duplicates
  }

  private extractKeywordsFromText(text: string): string[] {
    // Simple keyword extraction - in production, use proper NLP library
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ]);
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    return [...new Set(words)];
  }

  async suggestObjectivesForNode(nodeId: string): Promise<LearningObjective[]> {
    const node = await this.nodeRepository.findOne({
      where: { id: nodeId },
      relations: ['learningPath', 'learningObjectives'],
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${nodeId} not found`);
    }

    // Get existing objectives to avoid duplicates
    const existingObjectiveIds = new Set(node.learningObjectives.map((obj) => obj.id));

    // Suggest based on:
    // 1. Node title and description
    // 2. Related nodes in the same path
    // 3. Course content (if node is linked to a course)

    const suggestions: LearningObjective[] = [];

    // Suggestion 1: Content-based matching
    const nodeContent = `${node.title} ${node.description || ''}`;
    const contentKeywords = this.extractKeywordsFromText(nodeContent);

    const contentSuggestions = await this.objectiveRepository
      .createQueryBuilder('objective')
      .where('objective.keywords && :keywords', { keywords: contentKeywords })
      .andWhere('objective.id NOT IN (:...existing)', {
        existing: Array.from(existingObjectiveIds),
      })
      .limit(5)
      .getMany();

    suggestions.push(...contentSuggestions);

    // Suggestion 2: Domain-based matching
    if (node.courseId) {
      const course = await this.courseRepository.findOne({ where: { id: node.courseId } });
      if (course) {
        const domainSuggestions = await this.objectiveRepository
          .createQueryBuilder('objective')
          .where('objective.domain = :domain', { domain: course.level })
          .andWhere('objective.id NOT IN (:...existing)', {
            existing: Array.from(existingObjectiveIds),
          })
          .limit(3)
          .getMany();

        suggestions.push(...domainSuggestions);
      }
    }

    // Suggestion 3: Path-based matching (objectives from other nodes in same path)
    const pathNodes = await this.nodeRepository.find({
      where: { learningPathId: node.learningPathId },
      relations: ['learningObjectives'],
    });

    const pathObjectives = new Map<string, number>();
    pathNodes.forEach((pathNode) => {
      if (pathNode.id !== node.id) {
        pathNode.learningObjectives.forEach((obj) => {
          pathObjectives.set(obj.id, (pathObjectives.get(obj.id) || 0) + 1);
        });
      }
    });

    const frequentObjectives = Array.from(pathObjectives.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([objId]) => objId);

    const pathSuggestions = await this.objectiveRepository.findByIds(
      frequentObjectives.filter((id) => !existingObjectiveIds.has(id)),
    );

    suggestions.push(...pathSuggestions);

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.filter(
      (obj, index, self) => index === self.findIndex((o) => o.id === obj.id),
    );

    return uniqueSuggestions.slice(0, 10);
  }

  async getObjectiveHierarchy(domain?: string): Promise<any> {
    const queryBuilder = this.objectiveRepository.createQueryBuilder('objective');

    if (domain) {
      queryBuilder.where('objective.domain = :domain', { domain });
    }

    const objectives = await queryBuilder
      .orderBy('objective.domain', 'ASC')
      .addOrderBy('objective.difficulty', 'ASC')
      .getMany();

    // Build hierarchy by domain and difficulty
    const hierarchy: any = {};

    objectives.forEach((obj) => {
      if (!hierarchy[obj.domain]) {
        hierarchy[obj.domain] = {};
      }

      if (!hierarchy[obj.domain][obj.difficulty]) {
        hierarchy[obj.domain][obj.difficulty] = [];
      }

      hierarchy[obj.domain][obj.difficulty].push(obj);
    });

    return hierarchy;
  }

  async bulkMapObjectives(mappings: { nodeId: string; objectiveIds: string[] }[]): Promise<void> {
    for (const mapping of mappings) {
      await this.mapObjectivesToNode(mapping.nodeId, mapping.objectiveIds);
    }
  }
}
