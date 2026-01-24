import { UserFactory } from './user.factory';
import { CourseFactory } from './course.factory';
import { BaseFactory } from './base.factory';
// Factory registry for easy access
export class FactoryRegistry {
    static register(name, factory) {
        this.factories.set(name, factory);
    }
    static get(name) {
        const factory = this.factories.get(name);
        if (!factory) {
            throw new Error(`Factory '${name}' not found`);
        }
        return factory;
    }
    static create(name, options = {}) {
        return this.get(name).create(options);
    }
    static createMany(name, count, options = {}) {
        return this.get(name).createMany(count, options);
    }
    static build(name, options = {}) {
        return this.get(name).build(options);
    }
    static buildMany(name, count, options = {}) {
        return this.get(name).buildMany(count, options);
    }
    static resetSeed(seed = 12345) {
        BaseFactory.resetSeed(seed);
    }
}
FactoryRegistry.factories = new Map();
// Register all factories
FactoryRegistry.register('user', new UserFactory());
FactoryRegistry.register('course', new CourseFactory());
// Export individual factories
export const userFactory = new UserFactory();
export const courseFactory = new CourseFactory();
// Export factory registry
export { FactoryRegistry as Factory };
// Export base factory for custom factories
export { BaseFactory };
// Convenience functions
export const createUser = (options = {}) => userFactory.create(options);
export const createUsers = (count, options = {}) => userFactory.createMany(count, options);
export const createCourse = (options = {}) => courseFactory.create(options);
export const createCourses = (count, options = {}) => courseFactory.createMany(count, options);
// Test data presets
export const testData = {
    users: {
        admin: () => userFactory.admin(),
        instructor: () => userFactory.instructor(),
        student: () => userFactory.student(),
        unverified: () => userFactory.unverified(),
        team: () => userFactory.createTeam(),
    },
    courses: {
        published: () => courseFactory.published(),
        draft: () => courseFactory.draft(),
        featured: () => courseFactory.featured(),
        free: () => courseFactory.free(),
        premium: () => courseFactory.premium(),
        popular: () => courseFactory.popular(),
        catalog: (count = 10) => courseFactory.createCatalog(count),
    },
    scenarios: {
        // Complete learning platform scenario
        learningPlatform: () => {
            const admin = userFactory.admin();
            const instructors = userFactory.createMany(3, { traits: ['instructor'] });
            const students = userFactory.createMany(10, { traits: ['student'] });
            const courses = courseFactory.createCatalog(15);
            return {
                admin,
                instructors,
                students,
                courses,
            };
        },
        // Course enrollment scenario
        courseEnrollment: () => {
            const instructor = userFactory.instructor();
            const course = courseFactory.withInstructor(instructor);
            const students = userFactory.createMany(5, { traits: ['student'] });
            return {
                instructor,
                course,
                students,
            };
        },
        // Authentication scenario
        authentication: () => {
            const activeUser = userFactory.forAuth('password123');
            const unverifiedUser = userFactory.unverified();
            const inactiveUser = userFactory.inactive();
            return {
                activeUser,
                unverifiedUser,
                inactiveUser,
            };
        },
        // Payment scenario
        payment: () => {
            const student = userFactory.student();
            const premiumCourse = courseFactory.premium();
            const freeCourse = courseFactory.free();
            return {
                student,
                premiumCourse,
                freeCourse,
            };
        },
    },
};
// Database seeding utilities
export class TestSeeder {
    static async seedUsers(count = 10) {
        const users = [];
        // Create admin
        users.push(userFactory.admin({ overrides: { email: 'admin@test.com' } }));
        // Create instructors
        users.push(...userFactory.createMany(2, { traits: ['instructor'] }));
        // Create students
        users.push(...userFactory.createMany(count - 3, { traits: ['student'] }));
        return users;
    }
    static async seedCourses(instructors, count = 20) {
        const courses = [];
        instructors.forEach((instructor, index) => {
            const coursesPerInstructor = Math.ceil(count / instructors.length);
            const instructorCourses = courseFactory.createMany(coursesPerInstructor, {
                overrides: { instructor },
            });
            courses.push(...instructorCourses);
        });
        return courses.slice(0, count);
    }
    static async seedCompleteDatabase() {
        // Reset seed for consistent data
        BaseFactory.resetSeed(12345);
        const users = await this.seedUsers(50);
        const instructors = users.filter(u => u.role === 'instructor');
        const courses = await this.seedCourses(instructors, 100);
        // Create enrollments (simplified)
        const enrollments = [];
        const students = users.filter(u => u.role === 'student');
        students.forEach(student => {
            const enrolledCourses = courseFactory.pickRandomMany(courses, courseFactory.generateNumber(1, 5));
            enrolledCourses.forEach(course => {
                enrollments.push({
                    id: courseFactory.generateId(),
                    student,
                    course,
                    enrolledAt: courseFactory.generateDate({ past: true }),
                    progress: courseFactory.generateNumber(0, 100),
                    completed: courseFactory.generateBoolean(),
                });
            });
        });
        return {
            users,
            courses,
            enrollments,
        };
    }
}
