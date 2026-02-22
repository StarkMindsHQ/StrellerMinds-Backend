/**
 * Integration Workflow Automation Engine
 * Defines, manages and executes multi-step integration workflows
 */

import { generateId, sleep } from '../core/base';
import { IntegrationEvent } from '../core/base';
import { globalEventBus, IntegrationEventBus } from './evemt.bus';

// ─── Workflow Types ───────────────────────────────────────────────────────────

export type TriggerType = 'event' | 'schedule' | 'webhook' | 'manual';
export type ActionType =
  | 'http_request'
  | 'integration_call'
  | 'condition'
  | 'transform'
  | 'delay'
  | 'parallel'
  | 'foreach';
export type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

export interface WorkflowTrigger {
  type: TriggerType;
  eventPattern?: string; // for event triggers, e.g., 'canvas.enrollment.created'
  cronExpression?: string; // for schedule triggers
  webhookPath?: string; // for webhook triggers
}

export interface WorkflowAction {
  id: string;
  name: string;
  type: ActionType;
  config: ActionConfig;
  onSuccess?: string; // ID of next action
  onFailure?: string; // ID of action to run on failure
  retries?: number;
  timeoutMs?: number;
}

export type ActionConfig =
  | HttpRequestConfig
  | IntegrationCallConfig
  | ConditionConfig
  | TransformConfig
  | DelayConfig
  | ParallelConfig
  | ForEachConfig;

export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  storeResultAs?: string;
}

export interface IntegrationCallConfig {
  integrationId: string;
  method: string;
  args: unknown[];
  storeResultAs?: string;
}

export interface ConditionConfig {
  expression: string; // JavaScript expression evaluated against context
  trueBranch: string; // Action ID if true
  falseBranch: string; // Action ID if false
}

export interface TransformConfig {
  template: string; // Template with {{variable}} syntax
  storeResultAs: string;
}

export interface DelayConfig {
  durationMs: number;
}

export interface ParallelConfig {
  actionIds: string[];
  waitForAll: boolean;
}

export interface ForEachConfig {
  itemsPath: string; // Path in context to array
  actionId: string; // Action to execute for each item
  itemAlias: string; // Variable name for current item
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: Record<string, WorkflowAction>;
  startActionId: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  startedAt: Date;
  completedAt?: Date;
  context: WorkflowContext;
  logs: WorkflowLog[];
  error?: string;
  triggeredBy: string;
}

export interface WorkflowContext {
  trigger: Record<string, unknown>;
  variables: Record<string, unknown>;
  currentActionId?: string;
}

export interface WorkflowLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  actionId?: string;
  message: string;
  data?: unknown;
}

// ─── Workflow Engine ──────────────────────────────────────────────────────────

export class WorkflowEngine {
  private workflows = new Map<string, Workflow>();
  private runs = new Map<string, WorkflowRun>();
  private integrations = new Map<
    string,
    Record<string, (...args: unknown[]) => Promise<unknown>>
  >();
  private schedulers = new Map<string, NodeJS.Timeout>();
  private eventBus: IntegrationEventBus;

  constructor(eventBus: IntegrationEventBus = globalEventBus) {
    this.eventBus = eventBus;
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    this.setupTrigger(workflow);
  }

  unregisterWorkflow(workflowId: string): void {
    const timer = this.schedulers.get(workflowId);
    if (timer) clearInterval(timer);
    this.schedulers.delete(workflowId);
    this.workflows.delete(workflowId);
  }

  registerIntegration(
    integrationId: string,
    methods: Record<string, (...args: unknown[]) => Promise<unknown>>,
  ): void {
    this.integrations.set(integrationId, methods);
  }

  private setupTrigger(workflow: Workflow): void {
    if (!workflow.enabled) return;

    const { trigger } = workflow;

    switch (trigger.type) {
      case 'event':
        if (trigger.eventPattern) {
          this.eventBus.subscribe(trigger.eventPattern, async (event) => {
            await this.triggerWorkflow(workflow.id, 'event', event.payload);
          });
        }
        break;

      case 'schedule':
        if (trigger.cronExpression) {
          // Simple interval scheduling (production should use a proper cron library)
          const intervalMs = this.parseCronToMs(trigger.cronExpression);
          if (intervalMs > 0) {
            const timer = setInterval(
              () => this.triggerWorkflow(workflow.id, 'schedule', {}),
              intervalMs,
            );
            this.schedulers.set(workflow.id, timer);
          }
        }
        break;

      case 'webhook':
      case 'manual':
        // These are triggered externally
        break;
    }
  }

  private parseCronToMs(cron: string): number {
    // Very simplified - production use node-cron or similar
    const intervalMap: Record<string, number> = {
      '@hourly': 3600000,
      '@daily': 86400000,
      '@weekly': 604800000,
    };
    return intervalMap[cron] ?? 0;
  }

  // ─── Execution ─────────────────────────────────────────────────────────────

  async triggerWorkflow(
    workflowId: string,
    triggeredBy: string,
    triggerData: Record<string, unknown> = {},
  ): Promise<WorkflowRun> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    if (!workflow.enabled) throw new Error(`Workflow ${workflowId} is disabled`);

    const run: WorkflowRun = {
      id: generateId(),
      workflowId,
      status: 'running',
      startedAt: new Date(),
      context: {
        trigger: triggerData,
        variables: {},
      },
      logs: [],
      triggeredBy,
    };

    this.runs.set(run.id, run);
    this.log(run, 'info', undefined, `Workflow started: ${workflow.name}`);

    await globalEventBus.publish('workflow', 'workflow.started', {
      runId: run.id,
      workflowId,
    });

    // Execute asynchronously
    this.executeWorkflow(workflow, run).catch((err) => {
      run.status = 'failed';
      run.error = err instanceof Error ? err.message : String(err);
      run.completedAt = new Date();
    });

    return run;
  }

  private async executeWorkflow(workflow: Workflow, run: WorkflowRun): Promise<void> {
    try {
      await this.executeAction(workflow, run, workflow.startActionId);
      run.status = 'completed';
      run.completedAt = new Date();
      this.log(run, 'info', undefined, 'Workflow completed successfully');

      await globalEventBus.publish('workflow', 'workflow.completed', {
        runId: run.id,
        workflowId: workflow.id,
        durationMs: run.completedAt.getTime() - run.startedAt.getTime(),
      });
    } catch (err) {
      run.status = 'failed';
      run.error = err instanceof Error ? err.message : String(err);
      run.completedAt = new Date();
      this.log(run, 'error', run.context.currentActionId, `Workflow failed: ${run.error}`);

      await globalEventBus.publish('workflow', 'workflow.failed', {
        runId: run.id,
        workflowId: workflow.id,
        error: run.error,
      });
    }
  }

  private async executeAction(
    workflow: Workflow,
    run: WorkflowRun,
    actionId: string,
  ): Promise<void> {
    const action = workflow.actions[actionId];
    if (!action) return;

    run.context.currentActionId = actionId;
    this.log(run, 'info', actionId, `Executing action: ${action.name}`);

    const startTime = Date.now();
    let result: unknown;

    try {
      const timeoutMs = action.timeoutMs ?? 30000;
      result = await Promise.race([
        this.runAction(action, run),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Action timeout: ${action.name}`)), timeoutMs),
        ),
      ]);

      this.log(run, 'info', actionId, `Action completed in ${Date.now() - startTime}ms`);

      // Determine next action
      let nextActionId: string | undefined;
      if (action.type === 'condition') {
        nextActionId = result as string;
      } else {
        nextActionId = action.onSuccess;
      }

      if (nextActionId) {
        await this.executeAction(workflow, run, nextActionId);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.log(run, 'error', actionId, `Action failed: ${errorMsg}`);

      if (action.onFailure) {
        this.log(run, 'warn', actionId, `Running failure handler: ${action.onFailure}`);
        await this.executeAction(workflow, run, action.onFailure);
      } else {
        throw err;
      }
    }
  }

  private async runAction(action: WorkflowAction, run: WorkflowRun): Promise<unknown> {
    const config = action.config;

    switch (action.type) {
      case 'http_request':
        return this.runHttpRequest(config as HttpRequestConfig, run);

      case 'integration_call':
        return this.runIntegrationCall(config as IntegrationCallConfig, run);

      case 'condition':
        return this.evaluateCondition(config as ConditionConfig, run);

      case 'transform':
        return this.runTransform(config as TransformConfig, run);

      case 'delay': {
        const delayConfig = config as DelayConfig;
        await sleep(delayConfig.durationMs);
        return null;
      }

      case 'parallel':
        return this.runParallel(action as WorkflowAction & { config: ParallelConfig }, run);

      case 'foreach':
        return this.runForEach(action as WorkflowAction & { config: ForEachConfig }, run);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async runHttpRequest(config: HttpRequestConfig, run: WorkflowRun): Promise<unknown> {
    const url = this.interpolate(config.url, run.context);
    const response = await fetch(url, {
      method: config.method,
      headers: config.headers,
      body: config.body
        ? JSON.stringify(
            this.interpolateObject(config.body as Record<string, unknown>, run.context),
          )
        : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    if (config.storeResultAs) {
      run.context.variables[config.storeResultAs] = data;
    }
    return data;
  }

  private async runIntegrationCall(
    config: IntegrationCallConfig,
    run: WorkflowRun,
  ): Promise<unknown> {
    const integration = this.integrations.get(config.integrationId);
    if (!integration) {
      throw new Error(`Integration not registered: ${config.integrationId}`);
    }

    const method = integration[config.method];
    if (!method) {
      throw new Error(`Method not found: ${config.integrationId}.${config.method}`);
    }

    const interpolatedArgs = config.args.map((arg) =>
      typeof arg === 'string' ? this.interpolate(arg, run.context) : arg,
    );

    const result = await method(...interpolatedArgs);
    if (config.storeResultAs) {
      run.context.variables[config.storeResultAs] = result;
    }
    return result;
  }

  private evaluateCondition(config: ConditionConfig, run: WorkflowRun): string {
    try {
      const contextProxy = { ...run.context.variables, trigger: run.context.trigger };
      // Safe eval via Function constructor with limited scope
      const fn = new Function(...Object.keys(contextProxy), `return ${config.expression}`);
      const result = fn(...Object.values(contextProxy));
      return result ? config.trueBranch : config.falseBranch;
    } catch {
      return config.falseBranch;
    }
  }

  private runTransform(config: TransformConfig, run: WorkflowRun): string {
    const result = this.interpolate(config.template, run.context);
    run.context.variables[config.storeResultAs] = result;
    return result;
  }

  private async runParallel(
    action: WorkflowAction & { config: ParallelConfig },
    run: WorkflowRun,
  ): Promise<unknown[]> {
    // Note: this creates sub-runs conceptually but shares context
    const promises = action.config.actionIds.map((id) => ({
      id,
      promise: this.runAction(
        {
          ...action,
          id,
          config: action.config,
          type: 'integration_call', // placeholder
        },
        run,
      ),
    }));

    if (action.config.waitForAll) {
      const results = await Promise.all(promises.map((p) => p.promise));
      return results;
    } else {
      const results = await Promise.allSettled(promises.map((p) => p.promise));
      return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
    }
  }

  private async runForEach(
    action: WorkflowAction & { config: ForEachConfig },
    run: WorkflowRun,
  ): Promise<unknown[]> {
    const items = this.resolvePath(action.config.itemsPath, run.context) as unknown[];
    if (!Array.isArray(items)) {
      throw new Error(`ForEach: ${action.config.itemsPath} is not an array`);
    }

    const results: unknown[] = [];
    for (const item of items) {
      run.context.variables[action.config.itemAlias] = item;
      const result = await this.runAction({ ...action, id: action.config.actionId }, run);
      results.push(result);
    }
    return results;
  }

  // ─── Template Engine ───────────────────────────────────────────────────────

  private interpolate(template: string, context: WorkflowContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const value = this.resolvePath(path.trim(), context);
      return value !== undefined ? String(value) : '';
    });
  }

  private interpolateObject(
    obj: Record<string, unknown>,
    context: WorkflowContext,
  ): Record<string, unknown> {
    return JSON.parse(
      JSON.stringify(obj).replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        const value = this.resolvePath(path.trim(), context);
        return value !== undefined ? String(value) : '';
      }),
    );
  }

  private resolvePath(path: string, context: WorkflowContext): unknown {
    const parts = path.split('.');
    const root = parts[0];

    let current: unknown;
    if (root === 'trigger') {
      current = context.trigger;
    } else {
      current = context.variables[root];
    }

    for (let i = 1; i < parts.length; i++) {
      if (current == null) return undefined;
      current = (current as Record<string, unknown>)[parts[i]];
    }
    return current;
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  private log(
    run: WorkflowRun,
    level: WorkflowLog['level'],
    actionId: string | undefined,
    message: string,
    data?: unknown,
  ): void {
    run.logs.push({ timestamp: new Date(), level, actionId, message, data });
  }

  getRun(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  listWorkflows(): Workflow[] {
    return [...this.workflows.values()];
  }

  getWorkflowRuns(workflowId: string): WorkflowRun[] {
    return [...this.runs.values()].filter((r) => r.workflowId === workflowId);
  }

  updateWorkflow(
    workflowId: string,
    updates: Partial<Pick<Workflow, 'enabled' | 'name' | 'description' | 'tags'>>,
  ): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    Object.assign(workflow, updates, { updatedAt: new Date() });

    if ('enabled' in updates) {
      this.unregisterWorkflow(workflowId);
      if (updates.enabled) this.setupTrigger(workflow);
    }
  }

  // ─── Pre-built Workflow Templates ─────────────────────────────────────────

  static createEnrollmentSyncWorkflow(
    canvasIntegrationId: string,
    moodleIntegrationId: string,
  ): Workflow {
    return {
      id: generateId(),
      name: 'Canvas to Moodle Enrollment Sync',
      description: 'Automatically sync Canvas enrollments to Moodle',
      trigger: {
        type: 'event',
        eventPattern: 'canvas.enrollment.created',
      },
      startActionId: 'get-canvas-user',
      actions: {
        'get-canvas-user': {
          id: 'get-canvas-user',
          name: 'Get Canvas User Details',
          type: 'integration_call',
          config: {
            integrationId: canvasIntegrationId,
            method: 'getUser',
            args: ['{{trigger.userId}}'],
            storeResultAs: 'canvasUser',
          } as IntegrationCallConfig,
          onSuccess: 'find-moodle-user',
          retries: 2,
        },
        'find-moodle-user': {
          id: 'find-moodle-user',
          name: 'Find Moodle User by Email',
          type: 'integration_call',
          config: {
            integrationId: moodleIntegrationId,
            method: 'getUserByEmail',
            args: ['{{canvasUser.email}}'],
            storeResultAs: 'moodleUser',
          } as IntegrationCallConfig,
          onSuccess: 'enroll-moodle',
          onFailure: 'create-moodle-user',
          retries: 1,
        },
        'create-moodle-user': {
          id: 'create-moodle-user',
          name: 'Create User in Moodle',
          type: 'integration_call',
          config: {
            integrationId: moodleIntegrationId,
            method: 'createUser',
            args: [
              {
                username: '{{canvasUser.login_id}}',
                email: '{{canvasUser.email}}',
                firstname: '{{canvasUser.name}}',
                lastname: '',
                password: 'Welcome1!', // Should be random in production
              },
            ],
            storeResultAs: 'moodleUser',
          } as IntegrationCallConfig,
          onSuccess: 'enroll-moodle',
        },
        'enroll-moodle': {
          id: 'enroll-moodle',
          name: 'Enroll User in Moodle Course',
          type: 'integration_call',
          config: {
            integrationId: moodleIntegrationId,
            method: 'enrollUsers',
            args: [[{ roleid: 5, userid: '{{moodleUser.id}}', courseid: '{{trigger.courseId}}' }]],
          } as IntegrationCallConfig,
          retries: 2,
        },
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['lms', 'sync', 'enrollment'],
    };
  }

  static createMeetingCreatedNotificationWorkflow(
    zoomIntegrationId: string,
    googleIntegrationId: string,
  ): Workflow {
    return {
      id: generateId(),
      name: 'Zoom Meeting → Google Calendar Sync',
      description: 'Create a Google Calendar event when a Zoom meeting is scheduled',
      trigger: {
        type: 'event',
        eventPattern: 'zoom.meeting.created',
      },
      startActionId: 'create-calendar-event',
      actions: {
        'create-calendar-event': {
          id: 'create-calendar-event',
          name: 'Create Google Calendar Event',
          type: 'integration_call',
          config: {
            integrationId: googleIntegrationId,
            method: 'createEvent',
            args: [
              {
                summary: '{{trigger.meeting.title}}',
                description: `Join Zoom: {{trigger.meeting.joinUrl}}`,
                start: { dateTime: '{{trigger.meeting.startTime}}' },
                end: { dateTime: '{{trigger.meeting.startTime}}' },
              },
            ],
            storeResultAs: 'calendarEvent',
          } as IntegrationCallConfig,
          retries: 2,
        },
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['video', 'calendar', 'sync'],
    };
  }
}
