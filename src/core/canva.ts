/**
 * Canvas LMS Integration
 * Supports courses, enrollments, assignments, grades, and users
 */

import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationHealth,
  IntegrationStatus,
} from '../core/base';
import { HttpClient } from '../core/http-client';
import { globalEventBus } from './evemt.bus';

// ─── Canvas Data Types ────────────────────────────────────────────────────────

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: 'available' | 'completed' | 'deleted' | 'unpublished';
  start_at: string | null;
  end_at: string | null;
  enrollment_term_id: number;
  total_students?: number;
  teachers?: CanvasUser[];
}

export interface CanvasUser {
  id: number;
  name: string;
  login_id: string;
  email: string;
  avatar_url?: string;
  enrollment_state?: string;
  last_activity_at?: string;
}

export interface CanvasEnrollment {
  id: number;
  course_id: number;
  user_id: number;
  type: 'StudentEnrollment' | 'TeacherEnrollment' | 'TaEnrollment' | 'ObserverEnrollment';
  enrollment_state: 'active' | 'invited' | 'inactive' | 'completed' | 'rejected';
  grades?: {
    current_score: number | null;
    final_score: number | null;
    current_grade: string | null;
    final_grade: string | null;
  };
}

export interface CanvasAssignment {
  id: number;
  course_id: number;
  name: string;
  description: string;
  due_at: string | null;
  points_possible: number;
  submission_types: string[];
  published: boolean;
  grading_type: 'points' | 'pass_fail' | 'percent' | 'letter_grade';
}

export interface CanvasSubmission {
  id: number;
  assignment_id: number;
  user_id: number;
  score: number | null;
  grade: string | null;
  submitted_at: string | null;
  workflow_state: 'submitted' | 'unsubmitted' | 'graded' | 'pending_review';
  body?: string;
  url?: string;
}

export interface CanvasGradeUpdate {
  submission: {
    posted_grade: string | number;
    comment?: string;
  };
}

export interface CanvasIntegrationConfig extends IntegrationConfig {
  credentials: {
    accessToken: string;
    domain: string; // e.g., 'university.instructure.com'
  };
}

// ─── Canvas Integration ───────────────────────────────────────────────────────

export class CanvasIntegration extends BaseIntegration {
  private client: HttpClient;
  private domain: string;

  constructor(config: CanvasIntegrationConfig) {
    super(config);
    this.domain = config.credentials.domain;
    this.client = new HttpClient({
      baseUrl: `https://${this.domain}/api/v1`,
      auth: {
        type: 'bearer',
        token: config.credentials.accessToken,
      },
      defaultHeaders: {
        Accept: 'application/json+canvas-string-ids',
      },
      rateLimitPerMinute: 700, // Canvas default is 700 req/10 min, simplified
      timeout: 30000,
    });
  }

  async connect(): Promise<void> {
    await this.makeRequest(() => this.client.get('/users/self'));
    await globalEventBus.publish(this.getId(), 'canvas.connected', {
      domain: this.domain,
    });
  }

  async disconnect(): Promise<void> {
    await globalEventBus.publish(this.getId(), 'canvas.disconnected', {
      domain: this.domain,
    });
  }

  async healthCheck(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      await this.client.get('/users/self');
      return {
        integrationId: this.getId(),
        status: IntegrationStatus.CONNECTED,
        lastChecked: new Date(),
        latencyMs: Date.now() - start,
        metrics: this.getMetrics(),
      };
    } catch (err) {
      return {
        integrationId: this.getId(),
        status: IntegrationStatus.ERROR,
        lastChecked: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        metrics: this.getMetrics(),
      };
    }
  }

  // ─── Courses ──────────────────────────────────────────────────────────────

  async getCourses(params?: {
    enrollment_type?: 'teacher' | 'student' | 'ta';
    enrollment_state?: 'active' | 'completed';
    include?: string[];
  }): Promise<CanvasCourse[]> {
    return this.makeRequest(async () => {
      const queryParams: Record<string, string> = {};
      if (params?.enrollment_type) queryParams['enrollment_type'] = params.enrollment_type;
      if (params?.enrollment_state) queryParams['enrollment_state'] = params.enrollment_state;
      if (params?.include) queryParams['include[]'] = params.include.join(',');

      const response = await this.client.get<CanvasCourse[]>('/courses', queryParams);
      return { ...response, data: response.data ?? [] };
    }).then((res) => res.data ?? []);
  }

  async getCourse(courseId: number, include?: string[]): Promise<CanvasCourse> {
    return this.makeRequest(async () => {
      const params: Record<string, string> = {};
      if (include) params['include[]'] = include.join(',');
      const response = await this.client.get<CanvasCourse>(`/courses/${courseId}`, params);
      return response;
    }).then((res) => res.data!);
  }

  async createCourse(
    courseData: Partial<CanvasCourse> & { account_id?: number },
  ): Promise<CanvasCourse> {
    return this.makeRequest(async () => {
      const response = await this.client.post<CanvasCourse>('/courses', {
        course: courseData,
      });
      return response;
    }).then((res) => {
      globalEventBus.publish(this.getId(), 'canvas.course.created', { course: res.data });
      return res.data!;
    });
  }

  async updateCourse(courseId: number, updates: Partial<CanvasCourse>): Promise<CanvasCourse> {
    return this.makeRequest(async () => {
      const response = await this.client.put<CanvasCourse>(`/courses/${courseId}`, {
        course: updates,
      });
      return response;
    }).then((res) => res.data!);
  }

  // ─── Enrollments ──────────────────────────────────────────────────────────

  async getCourseEnrollments(
    courseId: number,
    options?: { type?: string[]; state?: string[] },
  ): Promise<CanvasEnrollment[]> {
    return this.makeRequest(async () => {
      const params: Record<string, string> = {};
      if (options?.type) params['type[]'] = options.type.join(',');
      if (options?.state) params['state[]'] = options.state.join(',');
      const response = await this.client.get<CanvasEnrollment[]>(
        `/courses/${courseId}/enrollments`,
        params,
      );
      return response;
    }).then((res) => res.data ?? []);
  }

  async enrollUser(
    courseId: number,
    userId: number,
    type: CanvasEnrollment['type'] = 'StudentEnrollment',
  ): Promise<CanvasEnrollment> {
    return this.makeRequest(async () => {
      const response = await this.client.post<CanvasEnrollment>(
        `/courses/${courseId}/enrollments`,
        { enrollment: { user_id: userId, type, enrollment_state: 'active' } },
      );
      return response;
    }).then((res) => {
      globalEventBus.publish(this.getId(), 'canvas.enrollment.created', {
        courseId,
        userId,
        type,
      });
      return res.data!;
    });
  }

  async unenrollUser(
    courseId: number,
    enrollmentId: number,
    task: 'delete' | 'conclude' | 'inactivate' = 'conclude',
  ): Promise<void> {
    await this.makeRequest(() =>
      this.client.delete(`/courses/${courseId}/enrollments/${enrollmentId}?task=${task}`),
    );
    await globalEventBus.publish(this.getId(), 'canvas.enrollment.removed', {
      courseId,
      enrollmentId,
    });
  }

  // ─── Assignments ──────────────────────────────────────────────────────────

  async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
    return this.makeRequest(async () => {
      const response = await this.client.get<CanvasAssignment[]>(
        `/courses/${courseId}/assignments`,
      );
      return response;
    }).then((res) => res.data ?? []);
  }

  async createAssignment(
    courseId: number,
    assignment: Partial<CanvasAssignment>,
  ): Promise<CanvasAssignment> {
    return this.makeRequest(async () => {
      const response = await this.client.post<CanvasAssignment>(
        `/courses/${courseId}/assignments`,
        { assignment },
      );
      return response;
    }).then((res) => {
      globalEventBus.publish(this.getId(), 'canvas.assignment.created', {
        courseId,
        assignment: res.data,
      });
      return res.data!;
    });
  }

  // ─── Grades & Submissions ─────────────────────────────────────────────────

  async getSubmissions(courseId: number, assignmentId: number): Promise<CanvasSubmission[]> {
    return this.makeRequest(async () => {
      const response = await this.client.get<CanvasSubmission[]>(
        `/courses/${courseId}/assignments/${assignmentId}/submissions`,
      );
      return response;
    }).then((res) => res.data ?? []);
  }

  async gradeSubmission(
    courseId: number,
    assignmentId: number,
    userId: number,
    grade: string | number,
    comment?: string,
  ): Promise<CanvasSubmission> {
    return this.makeRequest(async () => {
      const body: CanvasGradeUpdate = {
        submission: { posted_grade: grade },
      };
      if (comment) {
        (body as CanvasGradeUpdate & { comment: { text_comment: string } }).comment = {
          text_comment: comment,
        };
      }
      const response = await this.client.put<CanvasSubmission>(
        `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
        body,
      );
      return response;
    }).then((res) => {
      globalEventBus.publish(this.getId(), 'canvas.grade.updated', {
        courseId,
        assignmentId,
        userId,
        grade,
      });
      return res.data!;
    });
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async getUser(userId: number): Promise<CanvasUser> {
    return this.makeRequest(async () => {
      const response = await this.client.get<CanvasUser>(`/users/${userId}`);
      return response;
    }).then((res) => res.data!);
  }

  async searchUsers(query: string): Promise<CanvasUser[]> {
    return this.makeRequest(async () => {
      const response = await this.client.get<CanvasUser[]>('/accounts/1/users', {
        search_term: query,
        include: 'last_login',
      });
      return response;
    }).then((res) => res.data ?? []);
  }

  async getSelf(): Promise<CanvasUser> {
    return this.makeRequest(async () => {
      const response = await this.client.get<CanvasUser>('/users/self');
      return response;
    }).then((res) => res.data!);
  }

  // ─── LTI & External Tools ─────────────────────────────────────────────────

  async getExternalTools(
    courseId: number,
  ): Promise<Array<{ id: number; name: string; url: string }>> {
    return this.makeRequest(async () => {
      const response = await this.client.get<Array<{ id: number; name: string; url: string }>>(
        `/courses/${courseId}/external_tools`,
      );
      return response;
    }).then((res) => res.data ?? []);
  }
}
