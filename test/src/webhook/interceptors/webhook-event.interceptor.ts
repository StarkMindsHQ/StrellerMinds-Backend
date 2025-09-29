import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common"
import type { Observable } from "rxjs"
import { tap } from "rxjs/operators"
import type { WebhookEventService } from "../services/webhook-event.service"

@Injectable()
export class WebhookEventInterceptor implements NestInterceptor {
  constructor(private webhookEventService: WebhookEventService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const method = request.method
    const url = request.url

    return next.handle().pipe(
      tap(async (data) => {
        // Example: Auto-emit events based on HTTP operations
        if (method === "POST" && url.includes("/users")) {
          await this.webhookEventService.emitUserCreated(data.id, data)
        } else if (method === "PUT" && url.includes("/users")) {
          await this.webhookEventService.emitUserUpdated(data.id, data)
        } else if (method === "DELETE" && url.includes("/users")) {
          await this.webhookEventService.emitUserDeleted(request.params.id)
        }
        // Add more event triggers as needed
      }),
    )
  }
}
