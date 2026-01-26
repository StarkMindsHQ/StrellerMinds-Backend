import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { SearchElasticsearchModule } from './elasticsearch.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    SearchElasticsearchModule,
    CacheModule.register({
      ttl: 300,
      max: 100,
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
