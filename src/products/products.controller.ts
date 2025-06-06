import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CacheInterceptor } from '../cache/interceptors/cache.interceptor';
import { CacheInvalidationInterceptor } from '../cache/interceptors/cache-invalidation.interceptor';
import { CacheConditionGuard } from '../cache/guards/cache-condition.guard';
import {
  CacheProductData,
  CachePublicData,
  CacheForHours,
} from '../cache/decorators/cacheable.decorator';
import { CacheKeyWithQuery } from '../cache/decorators/cache-key.decorator';

@Controller('products')
@UseInterceptors(CacheInterceptor, CacheInvalidationInterceptor)
@UseGuards(CacheConditionGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @CacheProductData()
  @CacheKeyWithQuery()
  async findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  @CachePublicData()
  async getFeaturedProducts() {
    return this.productsService.getFeaturedProducts();
  }

  @Get('categories')
  @CacheForHours(4)
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Get(':id')
  @CacheProductData()
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  async create(@Body() createProductDto: any) {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateProductDto: any) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
