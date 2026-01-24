import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioItem } from '../entities/portfolio-item.entity';
import {
  CreatePortfolioItemDto,
  UpdatePortfolioItemDto,
  PortfolioItemResponseDto,
} from '../dto/profile.dto';
import { UserProfile } from '../entities/user-profile.entity';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioItem)
    private portfolioRepository: Repository<PortfolioItem>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
  ) {}

  async createPortfolioItem(
    profileId: string,
    createDto: CreatePortfolioItemDto,
  ): Promise<PortfolioItemResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const portfolioItem = this.portfolioRepository.create({
      ...createDto,
      profileId,
    });

    const saved = await this.portfolioRepository.save(portfolioItem);

    // Update portfolio items count
    profile.portfolioItemsCount++;
    await this.profileRepository.save(profile);

    return this.mapToResponseDto(saved);
  }

  async getPortfolioItems(
    profileId: string,
    includePrivate: boolean = false,
  ): Promise<PortfolioItemResponseDto[]> {
    const query = this.portfolioRepository.createQueryBuilder('portfolio');
    query.where('portfolio.profileId = :profileId', { profileId });

    if (!includePrivate) {
      query.andWhere('portfolio.isPublic = true');
    }

    query.orderBy('portfolio.displayOrder', 'ASC');
    query.addOrderBy('portfolio.createdAt', 'DESC');

    const items = await query.getMany();
    return items.map((item) => this.mapToResponseDto(item));
  }

  async getFeaturedItems(profileId: string): Promise<PortfolioItemResponseDto[]> {
    const items = await this.portfolioRepository.find({
      where: { profileId, isFeatured: true, isPublic: true },
      order: { displayOrder: 'ASC' },
    });

    return items.map((item) => this.mapToResponseDto(item));
  }

  async getPortfolioItemById(itemId: string): Promise<PortfolioItemResponseDto> {
    const item = await this.portfolioRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    return this.mapToResponseDto(item);
  }

  async updatePortfolioItem(
    itemId: string,
    updateDto: UpdatePortfolioItemDto,
  ): Promise<PortfolioItemResponseDto> {
    const item = await this.portfolioRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    Object.assign(item, updateDto);
    const updated = await this.portfolioRepository.save(item);

    return this.mapToResponseDto(updated);
  }

  async deletePortfolioItem(itemId: string): Promise<void> {
    const item = await this.portfolioRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    await this.portfolioRepository.remove(item);

    // Update portfolio items count
    const profile = await this.profileRepository.findOne({
      where: { id: item.profileId },
    });

    if (profile && profile.portfolioItemsCount > 0) {
      profile.portfolioItemsCount--;
      await this.profileRepository.save(profile);
    }
  }

  async reorderPortfolioItems(
    profileId: string,
    itemIds: string[],
  ): Promise<PortfolioItemResponseDto[]> {
    const items = await this.portfolioRepository.find({
      where: { profileId },
    });

    const itemMap = new Map(items.map((item) => [item.id, item]));

    for (let index = 0; index < itemIds.length; index++) {
      const item = itemMap.get(itemIds[index]);
      if (item) {
        item.displayOrder = index;
      }
    }

    const updated = await this.portfolioRepository.save(Array.from(itemMap.values()));

    return updated.map((item) => this.mapToResponseDto(item));
  }

  async trackPortfolioView(itemId: string): Promise<void> {
    const item = await this.portfolioRepository.findOne({
      where: { id: itemId },
    });

    if (item) {
      item.viewCount++;
      await this.portfolioRepository.save(item);

      // Update profile analytics
      const profile = await this.profileRepository.findOne({
        where: { id: item.profileId },
      });

      if (profile) {
        profile.portfolioItemsCount = await this.portfolioRepository.count({
          where: { profileId: item.profileId },
        });
      }
    }
  }

  async trackPortfolioClick(itemId: string): Promise<void> {
    const item = await this.portfolioRepository.findOne({
      where: { id: itemId },
    });

    if (item) {
      item.likeCount++;
      await this.portfolioRepository.save(item);
    }
  }

  async searchPortfolioItems(
    profileId: string,
    query: string,
  ): Promise<PortfolioItemResponseDto[]> {
    const items = await this.portfolioRepository
      .createQueryBuilder('portfolio')
      .where('portfolio.profileId = :profileId', { profileId })
      .andWhere('portfolio.isPublic = true')
      .andWhere(
        '(portfolio.title ILIKE :query OR portfolio.description ILIKE :query OR portfolio.tags @> ARRAY[:query])',
        { query: `%${query}%` },
      )
      .getMany();

    return items.map((item) => this.mapToResponseDto(item));
  }

  private mapToResponseDto(item: PortfolioItem): PortfolioItemResponseDto {
    return {
      id: item.id,
      profileId: item.profileId,
      title: item.title,
      description: item.description,
      type: item.type,
      content: item.content,
      imageUrl: item.imageUrl,
      projectUrl: item.projectUrl,
      repositoryUrl: item.repositoryUrl,
      certificateUrl: item.certificateUrl,
      technologies: item.technologies,
      tags: item.tags,
      startDate: item.startDate,
      endDate: item.endDate,
      isFeatured: item.isFeatured,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      isPublic: item.isPublic,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
