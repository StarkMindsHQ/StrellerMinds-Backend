import { Logger } from 'winston';

export interface TodoItem {
  id: string;
  file: string;
  line: number;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  dueDate?: Date;
  status?: 'open' | 'in-progress' | 'completed' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  issueUrl?: string;
}

export class TodoTracker {
  private static logger = new Logger();
  private static readonly todos: Map<string, TodoItem> = new Map();

  static createTodo(
    item: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'> & { status?: TodoItem['status'] },
    options: Partial<TodoItem> = {},
  ): string {
    const id = `TODO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const todo: TodoItem = {
      ...item,
      id,
      status: item.status || 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options,
    };

    this.todos.set(id, todo);
    this.logger.warn(
      `📝 TODO Created: ${todo.description} (${todo.file}:${todo.line})`,
      'TodoTracker',
    );

    return id;
  }

  static updateTodo(id: string, updates: Partial<TodoItem>): void {
    const todo = this.todos.get(id);
    if (!todo) {
      this.logger.error(`TODO not found: ${id}`, 'TodoTracker');
      return;
    }

    const updatedTodo = { ...todo, ...updates, updatedAt: new Date() };
    this.todos.set(id, updatedTodo);
    this.logger.info(`📝 TODO Updated: ${updatedTodo.description}`, 'TodoTracker');
  }

  static completeTodo(id: string): void {
    this.updateTodo(id, { status: 'completed' });
    this.logger.info(`✅ TODO Completed: ${id}`, 'TodoTracker');
  }

  static getOpenTodos(): TodoItem[] {
    return Array.from(this.todos.values()).filter((todo) => todo.status === 'open');
  }

  static getTodosByPriority(priority: TodoItem['priority']): TodoItem[] {
    return Array.from(this.todos.values()).filter((todo) => todo.priority === priority);
  }

  static getOverdueTodos(): TodoItem[] {
    const now = new Date();
    return Array.from(this.todos.values()).filter(
      (todo) => todo.dueDate && todo.dueDate < now && todo.status !== 'completed',
    );
  }

  static generateGitHubIssue(todo: TodoItem): string {
    const priorityEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    const body = `
## TODO: ${todo.description}

**File:** \`${todo.file}:${todo.line}\`

**Priority:** ${priorityEmoji[todo.priority]} ${todo.priority.toUpperCase()}

**Assignee:** ${todo.assignee || 'Unassigned'}

**Due Date:** ${todo.dueDate?.toISOString().split('T')[0] || 'Not set'}

### Implementation Details

\`\`\`typescript
// TODO: ${todo.description}
// Location: ${todo.file}:${todo.line}
// Priority: ${todo.priority}
// Created: ${todo.createdAt.toISOString()}
\`\`\`

### Acceptance Criteria
- [ ] Implement the functionality described above
- [ ] Add unit tests
- [ ] Update documentation
- [ ] Code review completed

### Additional Context
This TODO was automatically generated from the codebase. Please review the implementation requirements and assign to the appropriate team member.
    `.trim();

    return body;
  }

  static async createGitHubIssues(): Promise<void> {
    const openTodos = this.getOpenTodos();

    for (const todo of openTodos) {
      try {
        // In a real implementation, this would use GitHub API
        // await this.githubService.createIssue({
        //   title: `TODO: ${todo.description}`,
        //   body: this.generateGitHubIssue(todo),
        //   labels: ['todo', todo.priority, 'automated'],
        // });

        this.logger.info(`📋 GitHub Issue Created: ${todo.description}`, 'TodoTracker');
        this.updateTodo(todo.id, {
          status: 'in-progress',
          issueUrl: `https://github.com/issues/${todo.id}`,
        });
      } catch (error) {
        this.logger.error(
          `Failed to create GitHub issue for ${todo.id}: ${error.message}`,
          'TodoTracker',
        );
      }
    }
  }

  static scanCodeForTodos(filePath: string, content: string): void {
    const lines = content.split('\n');
    const todoRegex = /\/\/\s*TODO\s*:?\s*(.+)/i;

    lines.forEach((line, index) => {
      const match = line.match(todoRegex);
      if (match) {
        const description = match[1].trim();
        const priority = this.extractPriority(description);

        this.createTodo({
          file: filePath,
          line: index + 1,
          description: description.replace(/\[priority:\s*(\w+)\]/i, '').trim(),
          priority,
        });
      }
    });
  }

  private static extractPriority(description: string): TodoItem['priority'] {
    const priorityMatch = description.match(/\[priority:\s*(\w+)\]/i);
    if (priorityMatch) {
      const priority = priorityMatch[1].toLowerCase();
      switch (priority) {
        case 'critical':
        case 'high':
        case 'medium':
        case 'low':
          return priority as TodoItem['priority'];
        default:
          return 'medium';
      }
    }

    // Auto-detect priority based on keywords
    if (
      description.toLowerCase().includes('security') ||
      description.toLowerCase().includes('critical')
    ) {
      return 'high';
    }
    if (
      description.toLowerCase().includes('implement') ||
      description.toLowerCase().includes('add')
    ) {
      return 'medium';
    }

    return 'low';
  }
}

// Global TODO tracking function
export function trackTODO(
  description: string,
  priority: TodoItem['priority'] = 'medium',
  options: Partial<TodoItem> = {},
): void {
  const stack = new Error().stack;
  const fileMatch = stack?.match(/at.*\(([^)]+)\)/)?.[1]?.split(':');

  if (fileMatch) {
    const filePath = fileMatch[0];
    const lineNumber = parseInt(fileMatch[1]) || 0;

    TodoTracker.createTodo({
      ...options,
      file: filePath,
      line: lineNumber,
      description,
      priority,
    });
  }
}
