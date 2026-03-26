import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from '../../course/services/course.service';
import { TestDatabaseModule, TestDataFactory, TestDataManager } from '../index';
import { setupTestDatabase, cleanupTestDatabase, withEntities } from '../utils/test-setup';

describe('CourseService with Test Data Management', () => {
  let courseService: CourseService;
  let testDataFactory: TestDataFactory;
  let testDataManager: TestDataManager;
  let testContext: any;

  beforeAll(async () => {
    testContext = await setupTestDatabase({
      testId: 'course_service_test',
      isolate: true,
      seedData: 'standard',
      reset: true,
    });

    testDataFactory = testContext.testDataFactory;
    testDataManager = testContext.testDataManager;

    const module: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule],
      providers: [CourseService],
    })
    .overrideProvider('ConfigService')
    .useValue({
      get: (key: string) => {
        const config = {
          MAX_COURSES_PER_INSTRUCTOR: '50',
          DEFAULT_COURSE_PRICE: '99.99',
          COURSE_APPROVAL_REQUIRED: 'true',
        };
        return config[key];
      },
    })
    .compile();

    courseService = module.get<CourseService>(CourseService);
  });

  afterAll(async () => {
    await cleanupTestDatabase(testContext);
  });

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      const instructor = await testDataFactory.users.createInstructor();

      const createCourseDto = {
        title: 'Test Course',
        description: 'Test Description',
        category: 'Programming',
        level: 'Beginner',
        price: 99.99,
      };

      const result = await courseService.create(createCourseDto, instructor.id);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createCourseDto.title);
      expect(result.instructorId).toBe(instructor.id);
      expect(result.isPublished).toBe(false); // Should be draft by default
    });

    it('should throw error if user is not instructor', async () => {
      const student = await testDataFactory.users.createStudent();

      const createCourseDto = {
        title: 'Test Course',
        description: 'Test Description',
      };

      await expect(courseService.create(createCourseDto, student.id))
        .rejects.toThrow('Only instructors can create courses');
    });
  });

  describe('with entity-specific test data', () => {
    it('should handle course scenarios with specific entities', async () => {
      await withEntities(
        {
          users: 3, // 1 instructor, 2 students
          courses: 2,
          assignments: 5,
          payments: 3,
          forums: 1,
        },
        async (context, entities) => {
          const instructor = entities.users.find(u => u.role === 'instructor');
          const students = entities.users.filter(u => u.role === 'student');
          const courses = entities.courses;

          // Test course enrollment
          for (const course of courses) {
            for (const student of students) {
              const enrollment = await courseService.enrollStudent(course.id, student.id);
              expect(enrollment.studentId).toBe(student.id);
              expect(enrollment.courseId).toBe(course.id);
            }
          }

          // Test course statistics
          const stats = await courseService.getCourseStatistics(courses[0].id);
          expect(stats.enrolledCount).toBe(students.length);

          return { instructor, students, courses };
        }
      );
    });
  });

  describe('course management', () => {
    it('should publish a course', async () => {
      const instructor = await testDataFactory.users.createInstructor();
      const course = await testDataFactory.courses.createDraft({
        instructorId: instructor.id,
      });

      const publishedCourse = await courseService.publishCourse(course.id, instructor.id);

      expect(publishedCourse.isPublished).toBe(true);
    });

    it('should update course content', async () => {
      const instructor = await testDataFactory.users.createInstructor();
      const course = await testDataFactory.courses.create({
        instructorId: instructor.id,
      });

      const updateDto = {
        title: 'Updated Course Title',
        description: 'Updated Description',
      };

      const updatedCourse = await courseService.update(course.id, updateDto, instructor.id);

      expect(updatedCourse.title).toBe(updateDto.title);
      expect(updatedCourse.description).toBe(updateDto.description);
    });

    it('should delete course', async () => {
      const instructor = await testDataFactory.users.createInstructor();
      const course = await testDataFactory.courses.create({
        instructorId: instructor.id,
      });

      await courseService.delete(course.id, instructor.id);

      // Verify course is soft deleted
      const deletedCourse = await courseService.findOne(course.id);
      expect(deletedCourse.deletedAt).toBeTruthy();
    });
  });

  describe('course search and filtering', () => {
    it('should search courses by title', async () => {
      const instructor = await testDataFactory.users.createInstructor();
      
      await testDataFactory.courses.create({
        instructorId: instructor.id,
        title: 'JavaScript Fundamentals',
      });

      await testDataFactory.courses.create({
        instructorId: instructor.id,
        title: 'Python Basics',
      });

      await testDataFactory.courses.create({
        instructorId: instructor.id,
        title: 'Advanced JavaScript',
      });

      const searchResults = await courseService.searchCourses('JavaScript');

      expect(searchResults).toHaveLength(2);
      expect(searchResults.every(course => course.title.includes('JavaScript'))).toBe(true);
    });

    it('should filter courses by category', async () => {
      const instructor = await testDataFactory.users.createInstructor();
      
      await testDataFactory.courses.create({
        instructorId: instructor.id,
        category: 'Programming',
      });

      await testDataFactory.courses.create({
        instructorId: instructor.id,
        category: 'Programming',
      });

      await testDataFactory.courses.create({
        instructorId: instructor.id,
        category: 'Design',
      });

      const filteredCourses = await courseService.getCoursesByCategory('Programming');

      expect(filteredCourses).toHaveLength(2);
      expect(filteredCourses.every(course => course.category === 'Programming')).toBe(true);
    });
  });

  describe('course analytics', () => {
    it('should generate course analytics report', async () => {
      const instructor = await testDataFactory.users.createInstructor();
      const students = await testDataFactory.users.createStudents(10);
      
      const course = await testDataFactory.courses.create({
        instructorId: instructor.id,
        isPublished: true,
      });

      // Enroll students
      for (const student of students) {
        await courseService.enrollStudent(course.id, student.id);
      }

      const analytics = await courseService.getCourseAnalytics(course.id);

      expect(analytics).toHaveProperty('totalEnrollments');
      expect(analytics).toHaveProperty('completionRate');
      expect(analytics).toHaveProperty('averageRating');
      expect(analytics.totalEnrollments).toBe(students.length);
    });
  });
});
