import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testAuthentication() {
  try {
    // Test 1: Login with valid credentials
    console.log('Test 1: Login with valid credentials');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123',
    });
    console.log('Login Response:', loginResponse.data);
    const { access_token, refresh_token, user } = loginResponse.data;

    // Test 2: Access protected route with valid token
    console.log('\nTest 2: Access protected route with valid token');
    try {
      const protectedResponse = await axios.get(`${API_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      console.log('Protected Route Response:', protectedResponse.data);
    } catch (error) {
      console.log('Protected Route Error:', error.response?.data || error.message);
    }

    // Test 3: Refresh token
    console.log('\nTest 3: Refresh token');
    try {
      const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
        userId: user.id,
        refreshToken: refresh_token,
      });
      console.log('Refresh Token Response:', refreshResponse.data);
    } catch (error) {
      console.log('Refresh Token Error:', error.response?.data || error.message);
    }

    // Test 4: Access protected route with invalid token
    console.log('\nTest 4: Access protected route with invalid token');
    try {
      await axios.get(`${API_URL}/users/profile`, {
        headers: {
          Authorization: 'Bearer invalid_token',
        },
      });
    } catch (error) {
      console.log('Expected Error (Invalid Token):', error.response?.data || error.message);
    }

    // Test 5: Access protected route with expired token
    console.log('\nTest 5: Access protected route with expired token');
    try {
      await axios.get(`${API_URL}/users/profile`, {
        headers: {
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        },
      });
    } catch (error) {
      console.log('Expected Error (Expired Token):', error.response?.data || error.message);
    }
  } catch (error) {
    console.error('Test Error:', error.response?.data || error.message);
  }
}

testAuthentication();
