import { Injectable } from '@nestjs/common';

@Injectable()
export class VideoProcessor {
  async queueTranscoding(path: string) {
    // This is intentionally async & decoupled
    // In production, push to Bull / Redis queue
    console.log(`Queued video for transcoding: ${path}`);
  }
}
