// Custom processor functions for Artillery performance testing

module.exports = {
  // Generate random email for testing
  generateRandomEmail: function(userContext, events, done) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const email = `test${timestamp}${random}@example.com`;
    return done(null, email);
  },

  // Generate random password
  generateRandomPassword: function(userContext, events, done) {
    const passwords = [
      'TestPassword123!',
      'SecurePass456!',
      'StrongPass789!',
      'ComplexPass321!'
    ];
    const randomIndex = Math.floor(Math.random() * passwords.length);
    return done(null, passwords[randomIndex]);
  },

  // Extract user ID from response
  extractUserId: function(userContext, events, done) {
    if (events.response && events.response.body) {
      try {
        const responseBody = JSON.parse(events.response.body);
        if (responseBody.data && responseBody.data.user && responseBody.data.user.id) {
          userContext.userId = responseBody.data.user.id;
        }
      } catch (error) {
        console.log('Error parsing response:', error);
      }
    }
    return done();
  },

  // Extract access token from response
  extractAccessToken: function(userContext, events, done) {
    if (events.response && events.response.body) {
      try {
        const responseBody = JSON.parse(events.response.body);
        if (responseBody.data && responseBody.data.accessToken) {
          userContext.accessToken = responseBody.data.accessToken;
        }
      } catch (error) {
        console.log('Error parsing response:', error);
      }
    }
    return done();
  },

  // Log performance metrics
  logPerformance: function(userContext, events, done) {
    if (events.response && events.response.request) {
      const responseTime = events.response.timings.phases.total;
      const statusCode = events.response.statusCode;
      console.log(`Request completed in ${responseTime}ms with status ${statusCode}`);
    }
    return done();
  },

  // Handle rate limiting
  handleRateLimit: function(userContext, events, done) {
    if (events.response && events.response.statusCode === 429) {
      const retryAfter = events.response.headers['retry-after'] || 5;
      console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
      setTimeout(() => done(), retryAfter * 1000);
      return;
    }
    return done();
  }
};
