import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FilesModule } from './files/files.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [FilesModule],
})
export class AppModule {}
