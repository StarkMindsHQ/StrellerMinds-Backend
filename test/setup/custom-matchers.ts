import { validate as isUUID } from 'uuid';

// Custom Jest matchers for better test assertions
expect.extend({
  toBeValidUUID(received: string) {
    const pass = typeof received === 'string' && isUUID(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },

  toHaveValidationError(received: any, field: string) {
    const hasValidationError =
      received &&
      received.response &&
      received.response.message &&
      Array.isArray(received.response.message) &&
      received.response.message.some((msg: string) =>
        msg.toLowerCase().includes(field.toLowerCase()),
      );

    if (hasValidationError) {
      return {
        message: () => `expected not to have validation error for field ${field}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected to have validation error for field ${field}`,
        pass: false,
      };
    }
  },

  toMatchApiResponse(received: any) {
    const hasRequiredFields =
      received &&
      typeof received === 'object' &&
      received.hasOwnProperty('statusCode') &&
      received.hasOwnProperty('message');

    if (hasRequiredFields) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to match API response format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to match API response format`,
        pass: false,
      };
    }
  },

  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;

    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveProperty(received: any, property: string, value?: any) {
    const hasProperty = received && received.hasOwnProperty(property);

    if (value !== undefined) {
      const hasCorrectValue = hasProperty && received[property] === value;

      if (hasCorrectValue) {
        return {
          message: () =>
            `expected ${JSON.stringify(received)} not to have property ${property} with value ${value}`,
          pass: true,
        };
      } else {
        return {
          message: () =>
            `expected ${JSON.stringify(received)} to have property ${property} with value ${value}`,
          pass: false,
        };
      }
    }

    if (hasProperty) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have property ${property}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have property ${property}`,
        pass: false,
      };
    }
  },

  toBeArrayOfSize(received: any, size: number) {
    const isArray = Array.isArray(received);
    const hasCorrectSize = isArray && received.length === size;

    if (hasCorrectSize) {
      return {
        message: () => `expected array not to have size ${size}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be array of size ${size}`,
        pass: false,
      };
    }
  },

  toContainObject(received: any[], object: any) {
    const pass = received.some((item) =>
      Object.keys(object).every((key) => item[key] === object[key]),
    );

    if (pass) {
      return {
        message: () => `expected array not to contain object ${JSON.stringify(object)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected array to contain object ${JSON.stringify(object)}`,
        pass: false,
      };
    }
  },

  toHaveBeenCalledWithObjectContaining(received: jest.Mock, object: any) {
    const calls = received.mock.calls;
    const pass = calls.some((call) =>
      call.some(
        (arg) =>
          typeof arg === 'object' && Object.keys(object).every((key) => arg[key] === object[key]),
      ),
    );

    if (pass) {
      return {
        message: () =>
          `expected mock not to have been called with object containing ${JSON.stringify(object)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected mock to have been called with object containing ${JSON.stringify(object)}`,
        pass: false,
      };
    }
  },
});
