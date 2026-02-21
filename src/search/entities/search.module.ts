import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchElasticsearchModule } from '../elasticsearch.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from '../search.service';
import { RecommendationService } from './recommendation.service';
import { SearchLog } from './search.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SearchLog]),
    SearchElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200'),
        auth: {
          username: configService.get<string>('ELASTICSEARCH_USERNAME'),
          password: configService.get<string>('ELASTICSEARCH_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService, RecommendationService],
  exports: [SearchService, RecommendationService],
})
export class SearchModule {}