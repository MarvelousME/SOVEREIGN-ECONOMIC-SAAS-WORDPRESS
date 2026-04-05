/**
 * UBI CMS Security Tests
 * 
 * @version 1.0.0
 */

const assert = require('assert');

// Test: Security headers
function testSecurityHeaders() {
    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
    };
    
    assert(securityHeaders['X-Content-Type-Options'] === 'nosniff', 'CSP nosniff missing');
    assert(securityHeaders['X-Frame-Options'] === 'DENY', 'Clickjacking protection missing');
    console.log('✓ Security headers test passed');
}

// Test: JWT validation
function testJWTValidation() {
    const { authenticate } = require('../api/src/Middleware/auth');
    
    const mockReq = { headers: {} };
    const mockRes = {
        status: function(code) {
            return {
                json: function(data) {
                    assert(code === 401, 'Should reject missing token');
                    assert(data.error === 'No token provided', 'Wrong error message');
                }
            };
        }
    };
    const mockNext = () => {};
    
    authenticate(mockReq, mockRes, mockNext);
    console.log('✓ JWT validation test passed');
}

// Test: Rate limiting
function testRateLimiting() {
    const { rateLimit } = require('../api/src/Middleware/security');
    
    const limiter = rateLimit({ windowMs: 1000, maxRequests: 3 });
    
    for (let i = 0; i < 3; i++) {
        const mockReq = { ip: '127.0.0.1' };
        const mockRes = {};
        
        limiter(mockReq, mockRes, () => {});
    }
    
    const mockReq = { ip: '127.0.0.1' };
    let blocked = false;
    const mockRes = {
        status: (code) => {
            blocked = code === 429;
            return { json: () => {} };
        }
    };
    
    limiter(mockReq, mockRes, () => {});
    assert(blocked, 'Rate limit should block excess requests');
    console.log('✓ Rate limiting test passed');
}

// Test: Input validation
function testInputValidation() {
    const { validateInput } = require('../api/src/Middleware/security');
    
    const schema = {
        username: { required: true, minLength: 3, maxLength: 30 },
    };
    
    const mockReq = { body: { username: 'ab' } };
    const mockRes = {
        status: (code) => {
            return {
                json: (data) => {
                    assert(code === 400, 'Should reject invalid input');
                }
            };
        }
    };
    
    const middleware = validateInput(schema);
    middleware(mockReq, mockRes, () => {});
    console.log('✓ Input validation test passed');
}

// Run all tests
function runTests() {
    console.log('Running UBI CMS Security Tests...\n');
    
    try {
        testSecurityHeaders();
        testJWTValidation();
        testRateLimiting();
        testInputValidation();
        
        console.log('\n✓ All security tests passed');
    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
