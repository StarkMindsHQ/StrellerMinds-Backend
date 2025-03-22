import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }

    @Get('db')
    checkDatabase() {
        // This will be implemented later with actual DB health check
        return {
            database: 'connected',
            timestamp: new Date().toISOString(),
        };
    }
} 