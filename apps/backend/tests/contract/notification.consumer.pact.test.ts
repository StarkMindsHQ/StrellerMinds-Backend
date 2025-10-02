import { Pact, Matchers } from '@pact-foundation/pact';
import { PushNotificationService } from '../../../src/notifications/services/push-notification.service';
import { NotificationService } from '../../../src/notifications/services/notification.service';
import { SmsService } from '../../../src/notifications/services/sms.service';
import path from 'path';

describe('Notification Service Consumer Pact', () => {
  const provider = new Pact({
    consumer: 'StrellerMinds-Backend',
    provider: 'Firebase-Cloud-Messaging',
    port: 1238,
    log: path.resolve(process.cwd(), 'logs', 'notification-pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  let pushNotificationService: PushNotificationService;
  let notificationService: NotificationService;
  let smsService: SmsService;

  beforeAll(() => {
    return provider.setup().then(() => {
      // Create service instances with mocked dependencies
      pushNotificationService = new PushNotificationService({} as any); // configService

      // Mock the Firebase admin SDK for testing
      (pushNotificationService as any).firebaseAdmin = {
        messaging: () => ({
          send: jest.fn(),
        }),
      };

      // Mock other services
      notificationService = new NotificationService(
        {} as any, // notificationRepository
        {} as any, // userRepository
        {} as any, // emailService
        {} as any, // smsService
        pushNotificationService,
        {} as any, // preferenceService
        {} as any, // analyticsService
        {} as any, // eventEmitter
      );

      smsService = new SmsService({} as any); // configService
    });
  });

  afterAll(() => {
    return provider.finalize();
  });

  describe('Firebase Cloud Messaging', () => {
    it('should send push notification successfully', () => {
      const deviceToken = 'fcm_device_token_123456789';
      const notificationData = {
        title: 'New Course Available',
        body: 'Blockchain Fundamentals course is now available for enrollment',
        data: {
          courseId: 'course_123',
          type: 'course_available',
          actionUrl: '/courses/course_123',
        },
      };

      const expectedResponse = {
        success: true,
        messageId: 'projects/strellerminds/messages/1234567890',
        multicastId: 1234567890,
      };

      return provider
        .addInteraction({
          state: 'Firebase Cloud Messaging is available',
          uponReceiving: 'a request to send push notification',
          withRequest: {
            method: 'POST',
            path: '/v1/projects/strellerminds/messages:send',
            headers: {
              'Content-Type': 'application/json',
              Authorization: Matchers.like('Bearer ya29.c...'),
            },
            body: {
              message: {
                token: Matchers.like(deviceToken),
                notification: {
                  title: Matchers.like(notificationData.title),
                  body: Matchers.like(notificationData.body),
                },
                data: Matchers.like(notificationData.data),
              },
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              name: Matchers.like(expectedResponse.messageId),
              success: Matchers.boolean(expectedResponse.success),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Firebase messaging send method
            (pushNotificationService as any).firebaseAdmin
              .messaging()
              .send.mockResolvedValue(expectedResponse.messageId);

            // Call the actual service method
            const result = await pushNotificationService.sendPushNotification(
              deviceToken,
              notificationData.title,
              notificationData.body,
              notificationData.data,
            );

            // Assert the result
            expect(result).toBe(true);
          });
        });
    });

    it('should handle invalid device token', () => {
      const invalidToken = 'invalid_device_token';
      const notificationData = {
        title: 'Test Notification',
        body: 'This should fail',
      };

      const errorResponse = {
        error: {
          code: 400,
          message: 'Request contains an invalid argument.',
          status: 'INVALID_ARGUMENT',
          details: [
            {
              '@type': 'type.googleapis.com/google.rpc.BadRequest',
              fieldViolations: [
                {
                  field: 'message.token',
                  description: 'Invalid registration token',
                },
              ],
            },
          ],
        },
      };

      return provider
        .addInteraction({
          state: 'Firebase Cloud Messaging rejects invalid token',
          uponReceiving: 'a request to send push notification with invalid token',
          withRequest: {
            method: 'POST',
            path: '/v1/projects/strellerminds/messages:send',
            headers: {
              'Content-Type': 'application/json',
              Authorization: Matchers.like('Bearer ya29.c...'),
            },
            body: {
              message: {
                token: Matchers.like(invalidToken),
                notification: {
                  title: Matchers.like(notificationData.title),
                  body: Matchers.like(notificationData.body),
                },
              },
            },
          },
          willRespondWith: {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: {
                code: Matchers.integer(errorResponse.error.code),
                message: Matchers.like(errorResponse.error.message),
                status: Matchers.like(errorResponse.error.status),
                details: Matchers.eachLike({
                  '@type': Matchers.like('type.googleapis.com/google.rpc.BadRequest'),
                  fieldViolations: Matchers.eachLike({
                    field: Matchers.like('message.token'),
                    description: Matchers.like('Invalid registration token'),
                  }),
                }),
              },
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Firebase messaging send method to throw an error
            (pushNotificationService as any).firebaseAdmin
              .messaging()
              .send.mockRejectedValue(new Error('Invalid registration token'));

            // Call the service method and expect it to return false
            const result = await pushNotificationService.sendPushNotification(
              invalidToken,
              notificationData.title,
              notificationData.body,
            );

            // Assert the result
            expect(result).toBe(false);
          });
        });
    });

    it('should send batch push notifications successfully', () => {
      const deviceTokens = [
        'fcm_device_token_123456789',
        'fcm_device_token_987654321',
        'fcm_device_token_555666777',
      ];

      const notificationData = {
        title: 'Course Update',
        body: 'Your enrolled course has been updated with new content',
        data: {
          courseId: 'course_456',
          type: 'course_update',
        },
      };

      const expectedResponse = {
        successCount: 3,
        failureCount: 0,
        responses: [
          {
            success: true,
            messageId: 'projects/strellerminds/messages/1234567890',
          },
          {
            success: true,
            messageId: 'projects/strellerminds/messages/0987654321',
          },
          {
            success: true,
            messageId: 'projects/strellerminds/messages/1112223333',
          },
        ],
      };

      return provider
        .addInteraction({
          state: 'Firebase Cloud Messaging supports batch sending',
          uponReceiving: 'a request to send batch push notifications',
          withRequest: {
            method: 'POST',
            path: '/v1/projects/strellerminds/messages:send',
            headers: {
              'Content-Type': 'application/json',
              Authorization: Matchers.like('Bearer ya29.c...'),
            },
            body: {
              message: {
                tokens: Matchers.eachLike(Matchers.like('fcm_device_token_123456789')),
                notification: {
                  title: Matchers.like(notificationData.title),
                  body: Matchers.like(notificationData.body),
                },
                data: Matchers.like(notificationData.data),
              },
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              successCount: Matchers.integer(expectedResponse.successCount),
              failureCount: Matchers.integer(expectedResponse.failureCount),
              responses: Matchers.eachLike({
                success: Matchers.boolean(true),
                messageId: Matchers.like('projects/strellerminds/messages/1234567890'),
              }),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Firebase messaging sendMulticast method
            (pushNotificationService as any).firebaseAdmin.messaging().sendMulticast = jest
              .fn()
              .mockResolvedValue({
                successCount: expectedResponse.successCount,
                failureCount: expectedResponse.failureCount,
                responses: expectedResponse.responses,
              });

            // Call the service method for each token (simulating batch sending)
            const results = await Promise.all(
              deviceTokens.map((token) =>
                pushNotificationService.sendPushNotification(
                  token,
                  notificationData.title,
                  notificationData.body,
                  notificationData.data,
                ),
              ),
            );

            // Assert all results are successful
            expect(results.every((result) => result === true)).toBe(true);
          });
        });
    });

    it('should handle FCM service unavailable error', () => {
      const deviceToken = 'fcm_device_token_123456789';
      const notificationData = {
        title: 'Service Test',
        body: 'Testing service availability',
      };

      const errorResponse = {
        error: {
          code: 503,
          message: 'Service unavailable',
          status: 'UNAVAILABLE',
        },
      };

      return provider
        .addInteraction({
          state: 'Firebase Cloud Messaging service is unavailable',
          uponReceiving: 'a request when FCM service is down',
          withRequest: {
            method: 'POST',
            path: '/v1/projects/strellerminds/messages:send',
            headers: {
              'Content-Type': 'application/json',
              Authorization: Matchers.like('Bearer ya29.c...'),
            },
            body: {
              message: {
                token: Matchers.like(deviceToken),
                notification: {
                  title: Matchers.like(notificationData.title),
                  body: Matchers.like(notificationData.body),
                },
              },
            },
          },
          willRespondWith: {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: {
                code: Matchers.integer(errorResponse.error.code),
                message: Matchers.like(errorResponse.error.message),
                status: Matchers.like(errorResponse.error.status),
              },
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the Firebase messaging send method to throw a service unavailable error
            (pushNotificationService as any).firebaseAdmin
              .messaging()
              .send.mockRejectedValue(new Error('Service unavailable'));

            // Call the service method and expect it to return false
            const result = await pushNotificationService.sendPushNotification(
              deviceToken,
              notificationData.title,
              notificationData.body,
            );

            // Assert the result
            expect(result).toBe(false);
          });
        });
    });
  });

  describe('SMS Service', () => {
    it('should send SMS successfully', () => {
      const phoneNumber = '+1234567890';
      const message =
        'Your course enrollment is confirmed. Access your course at: https://strellerminds.com/courses';

      const expectedResponse = {
        sid: 'SM1234567890abcdef',
        status: 'sent',
        to: phoneNumber,
        body: message,
        dateCreated: '2023-12-01T10:00:00Z',
        price: '0.0075',
        priceUnit: 'USD',
      };

      return provider
        .addInteraction({
          state: 'SMS service is available',
          uponReceiving: 'a request to send SMS',
          withRequest: {
            method: 'POST',
            path: '/2010-04-01/Accounts/AC1234567890abcdef/Messages.json',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: Matchers.like('Basic QUMxMjM0NTY3ODkwYWJjZGVm...'),
            },
            body: Matchers.like(
              `To=${encodeURIComponent(phoneNumber)}&Body=${encodeURIComponent(message)}`,
            ),
          },
          willRespondWith: {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              sid: Matchers.like(expectedResponse.sid),
              status: Matchers.like(expectedResponse.status),
              to: Matchers.like(expectedResponse.to),
              body: Matchers.like(expectedResponse.body),
              date_created: Matchers.iso8601DateTime(expectedResponse.dateCreated),
              price: Matchers.like(expectedResponse.price),
              price_unit: Matchers.like(expectedResponse.priceUnit),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the SMS service
            (smsService as any).twilioClient = {
              messages: {
                create: jest.fn().mockResolvedValue(expectedResponse),
              },
            };

            // Call the actual service method
            const result = await smsService.sendSms(phoneNumber, message);

            // Assert the result
            expect(result).toBe(true);
          });
        });
    });

    it('should handle invalid phone number', () => {
      const invalidPhoneNumber = 'invalid_phone';
      const message = 'Test message';

      const errorResponse = {
        code: 21211,
        message: "The 'To' number is not a valid phone number.",
        more_info: 'https://www.twilio.com/docs/errors/21211',
        status: 400,
      };

      return provider
        .addInteraction({
          state: 'SMS service rejects invalid phone number',
          uponReceiving: 'a request to send SMS to invalid phone number',
          withRequest: {
            method: 'POST',
            path: '/2010-04-01/Accounts/AC1234567890abcdef/Messages.json',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: Matchers.like('Basic QUMxMjM0NTY3ODkwYWJjZGVm...'),
            },
            body: Matchers.like(
              `To=${encodeURIComponent(invalidPhoneNumber)}&Body=${encodeURIComponent(message)}`,
            ),
          },
          willRespondWith: {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              code: Matchers.integer(errorResponse.code),
              message: Matchers.like(errorResponse.message),
              more_info: Matchers.like(errorResponse.more_info),
              status: Matchers.integer(errorResponse.status),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the SMS service to throw an error
            (smsService as any).twilioClient = {
              messages: {
                create: jest.fn().mockRejectedValue(new Error('Invalid phone number')),
              },
            };

            // Call the service method and expect it to return false
            const result = await smsService.sendSms(invalidPhoneNumber, message);

            // Assert the result
            expect(result).toBe(false);
          });
        });
    });
  });
});
