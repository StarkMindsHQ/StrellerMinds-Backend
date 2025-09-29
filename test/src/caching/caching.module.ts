import { Module, Global } from "@nestjs/common"
import { CacheService } from "./services/cache.service"

@Global() // Make this module global so CacheService can be injected anywhere
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CachingModule {}
