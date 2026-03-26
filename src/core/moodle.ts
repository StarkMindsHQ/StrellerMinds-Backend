/**
 * Moodle LMS Integration
 * Supports courses, users, grades, and activities via REST API
 */

import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationHealth,
  IntegrationStatus,
} from '../core/base';
import { HttpClient } from '../core/http-client';
import { globalEventBus } from './evemt.bus';

// ─── Moodle Data Types ────────────────────────────────────────────────────────

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  summary: string;
  visible: 0 | 1;
  startdate: number; // Unix timestamp
  enddate: number;
  numsections: number;
  enrolledusercount?: number;
  categoryid: number;
}

export interface MoodleUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
  lastaccess: number;
  suspended: boolean;
  roles?: Array<{ roleid: number; name: string; shortname: string }>;
  preferences?: Array<{ name: string; value: string }>;
}

export interface MoodleGrade {
  userid: number;
  userfullname: string;
  useridnumber: string;
  maxdepth: number;
  maxvisiblelevels: number;
  canviewhidden: boolean;
  courseid: number;
  courseidnumber: string;
  courseshortname: string;
  tabletype: number;
  tabledata: MoodleGradeItem[];
}

export interface MoodleGradeItem {
  itemname?: { class: string; colspan: number; content: string };
  leader?: { class: string; rowspan: number };
  grade?: { class: string; content: string; id: string };
  percentage?: { class: string; content: string };
}

export interface MoodleActivity {
  id: number;
  course: number;
  module: number;
  name: string;
  modname: string; // 'assign', 'quiz', 'forum', etc.
  instance: number;
  visible: boolean;
  uservisible?: boolean;
  completiondata?: {
    state: number; // 0=incomplete, 1=complete, 2=passed, 3=failed
    timecompleted: number;
  };
}

export interface MoodleEnrolment {
  userid: number;
  courseid: number;
  roleid: number;
  timestart: number;
  timeend: number;
  status: number;
}

export interface MoodleIntegrationConfig extends IntegrationConfig {
  credentials: {
    token: string;
    domain: string; // e.g., 'moodle.university.edu'
  };
}

// ─── Moodle Integration ───────────────────────────────────────────────────────

export class MoodleIntegration extends BaseIntegration {
  private client: HttpClient;
  private domain: string;
  private token: string;

  constructor(config: MoodleIntegrationConfig) {
    super(config);
    this.domain = config.credentials.domain;
    this.token = config.credentials.token;
    this.client = new HttpClient({
      baseUrl: `https://${this.domain}/webservice/rest/server.php`,
      defaultHeaders: { Accept: 'application/json' },
      rateLimitPerMinute: 300,
      timeout: 30000,
    });
  }

  /**
   * Moodle uses a single endpoint with wsfunction and wstoken params
   */
  private async callFunction<T>(
    wsfunction: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    return this.makeRequest(async () => {
      const searchParams: Record<string, string> = {
        wstoken: this.token,
        wsfunction,
        moodlewsrestformat: 'json',
      };

      // Flatten nested params for Moodle's query format
      this.flattenParams(params, searchParams);

      const response = await this.client.get<T>('', searchParams);

      // Moodle returns errors within the 200 response
      const data = response.data as unknown;
      if (data && typeof data === 'object' && 'exception' in data) {
        throw new Error(
          `Moodle API error: ${(data as { message?: string }).message ?? wsfunction}`,
        );
      }

      return response;
    }).then((res) => res.data as T);
  }

  private flattenParams(
    params: Record<string, unknown>,
    result: Record<string, string>,
    prefix = '',
  ): void {
    for (const [key, value] of Object.entries(params)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            this.flattenParams(item as Record<string, unknown>, result, `${fullKey}[${index}]`);
          } else {
            result[`${fullKey}[${index}]`] = String(item);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        this.flattenParams(value as Record<string, unknown>, result, fullKey);
      } else if (value !== undefined && value !== null) {
        result[fullKey] = String(value);
      }
    }
  }

  async connect(): Promise<void> {
    await this.callFunction('core_webservice_get_site_info');
    await globalEventBus.publish(this.getId(), 'moodle.connected', {
      domain: this.domain,
    });
  }

  async disconnect(): Promise<void> {
    await globalEventBus.publish(this.getId(), 'moodle.disconnected', {
      domain: this.domain,
    });
  }

  async healthCheck(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      await this.callFunction('core_webservice_get_site_info');
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

  // ─── Site Info ────────────────────────────────────────────────────────────

  async getSiteInfo(): Promise<{
    sitename: string;
    username: string;
    siteurl: string;
    release: string;
    version: string;
  }> {
    return this.callFunction('core_webservice_get_site_info');
  }

  // ─── Courses ──────────────────────────────────────────────────────────────

  async getCourses(): Promise<MoodleCourse[]> {
    return this.callFunction<MoodleCourse[]>('core_course_get_courses');
  }

  async getCourse(courseId: number): Promise<MoodleCourse> {
    const courses = await this.callFunction<MoodleCourse[]>('core_course_get_courses', {
      options: { ids: [courseId] },
    });
    const course = courses[0];
    if (!course) throw new Error(`Course ${courseId} not found`);
    return course;
  }

  async createCourse(course: {
    shortname: string;
    fullname: string;
    categoryid: number;
    summary?: string;
    visible?: 0 | 1;
    startdate?: number;
    enddate?: number;
  }): Promise<{ id: number; shortname: string }> {
    const result = await this.callFunction<Array<{ id: number; shortname: string }>>(
      'core_course_create_courses',
      { courses: [course] },
    );

    await globalEventBus.publish(this.getId(), 'moodle.course.created', {
      course: result[0],
    });

    return result[0];
  }

  async updateCourse(courseId: number, updates: Partial<MoodleCourse>): Promise<void> {
    await this.callFunction('core_course_update_courses', {
      courses: [{ id: courseId, ...updates }],
    });
  }

  async searchCourses(query: string): Promise<MoodleCourse[]> {
    return this.callFunction<MoodleCourse[]>('core_course_search_courses', {
      criterianame: 'search',
      criteriavalue: query,
    });
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async getUsers(field: string, values: string[]): Promise<MoodleUser[]> {
    return this.callFunction<MoodleUser[]>('core_user_get_users_by_field', {
      field,
      values,
    });
  }

  async getUserById(userId: number): Promise<MoodleUser> {
    const users = await this.getUsers('id', [String(userId)]);
    const user = users[0];
    if (!user) throw new Error(`User ${userId} not found`);
    return user;
  }

  async getUserByEmail(email: string): Promise<MoodleUser> {
    const users = await this.getUsers('email', [email]);
    const user = users[0];
    if (!user) throw new Error(`User with email ${email} not found`);
    return user;
  }

  async createUser(user: {
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    email: string;
    auth?: string;
  }): Promise<{ id: number; username: string }> {
    const result = await this.callFunction<Array<{ id: number; username: string }>>(
      'core_user_create_users',
      { users: [{ auth: 'manual', ...user }] },
    );

    await globalEventBus.publish(this.getId(), 'moodle.user.created', {
      user: result[0],
    });

    return result[0];
  }

  async updateUser(
    userId: number,
    updates: Partial<MoodleUser> & { password?: string },
  ): Promise<void> {
    await this.callFunction('core_user_update_users', {
      users: [{ id: userId, ...updates }],
    });
  }

  // ─── Enrollments ──────────────────────────────────────────────────────────

  async enrollUsers(
    enrolments: Array<{ roleid: number; userid: number; courseid: number }>,
  ): Promise<void> {
    await this.callFunction('enrol_manual_enrol_users', { enrolments });

    await globalEventBus.publish(this.getId(), 'moodle.enrollment.created', {
      enrolments,
    });
  }

  async unenrolUsers(
    enrolments: Array<{ userid: number; courseid: number; roleid?: number }>,
  ): Promise<void> {
    await this.callFunction('enrol_manual_unenrol_users', { enrolments });
  }

  async getCourseEnrolledUsers(courseId: number): Promise<MoodleUser[]> {
    return this.callFunction<MoodleUser[]>('core_enrol_get_enrolled_users', {
      courseid: courseId,
    });
  }

  // ─── Grades ───────────────────────────────────────────────────────────────

  async getUserGrades(courseId: number, userId: number): Promise<MoodleGrade[]> {
    return this.callFunction<MoodleGrade[]>('gradereport_user_get_grade_items', {
      courseid: courseId,
      userid: userId,
    });
  }

  async updateGrade(
    courseId: number,
    itemId: number,
    userId: number,
    grade: number,
    feedback?: string,
  ): Promise<void> {
    await this.callFunction('core_grades_update_grades', {
      source: 'integration',
      courseid: courseId,
      component: 'mod_assign',
      activityid: itemId,
      itemnumber: 0,
      grades: [
        {
          studentid: userId,
          grade,
          str_feedback: feedback ?? '',
        },
      ],
    });

    await globalEventBus.publish(this.getId(), 'moodle.grade.updated', {
      courseId,
      itemId,
      userId,
      grade,
    });
  }

  // ─── Activities ───────────────────────────────────────────────────────────

  async getCourseContents(courseId: number): Promise<
    Array<{
      id: number;
      name: string;
      modules: MoodleActivity[];
    }>
  > {
    return this.callFunction('core_course_get_contents', {
      courseid: courseId,
    });
  }

  async getCompletionStatus(
    courseId: number,
    userId: number,
  ): Promise<Array<{ cmid: number; completionstate: number; tracking: number }>> {
    return this.callFunction('core_completion_get_activities_completion_status', {
      courseid: courseId,
      userid: userId,
    });
  }
}
