import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeerRecognition } from './entities/peer-recognition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PeerRecognition,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class RecognitionModule {}
