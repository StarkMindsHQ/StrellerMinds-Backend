// Module communication interfaces for decoupled architecture

export interface IUserService {
  findById(id: string): Promise<any>;
  findByEmail(email: string): Promise<any>;
  updateProfile(id: string, data: any): Promise<any>;
}

export interface ICourseService {
  findById(id: string): Promise<any>;
  enrollUser(userId: string, courseId: string): Promise<any>;
  getCourseProgress(userId: string, courseId: string): Promise<any>;
}

export interface INotificationService {
  sendEmail(to: string, subject: string, template: string, data: any): Promise<void>;
  sendInApp(userId: string, message: string, type: string): Promise<void>;
}

export interface IAnalyticsService {
  trackEvent(event: string, userId: string, metadata: any): Promise<void>;
  getUserAnalytics(userId: string): Promise<any>;
}

export interface IPaymentService {
  processPayment(userId: string, amount: number, metadata: any): Promise<any>;
  getPaymentHistory(userId: string): Promise<any>;
}

export interface IGamificationService {
  awardPoints(userId: string, points: number, reason: string): Promise<void>;
  checkAchievements(userId: string): Promise<void>;
}
