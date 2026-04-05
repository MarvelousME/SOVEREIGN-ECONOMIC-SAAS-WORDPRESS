import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const transactionDuration = new Trend('transaction_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% of requests under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'],  // Error rate less than 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const users = [];
for (let i = 0; i < 100; i++) {
  users.push({
    username: `loadtest_user_${i}`,
    password: 'TestPassword123!',
  });
}

export function setup() {
  // Setup: Create test users
  console.log('Setting up load test...');
  
  for (const user of users) {
    const res = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (res.status !== 201) {
      console.error(`Failed to create user ${user.username}`);
    }
  }
  
  return { users };
}

export default function(data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  
  // Login
  let loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    username: user.username,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  if (loginRes.status !== 200) {
    return;
  }
  
  const token = loginRes.json('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  sleep(1);
  
  // Get user accounts
  let accountsRes = http.get(`${BASE_URL}/api/accounts/user/${user.username}`, {
    headers,
  });
  
  check(accountsRes, {
    'get accounts successful': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Create a transaction (simulate task reward or transfer)
  const startTime = new Date();
  
  let txRes = http.post(`${BASE_URL}/api/transactions`, JSON.stringify({
    fromAccountId: 'system-pool-id',
    toAccountId: accountsRes.json('data[0].id'),
    amount: '10',
    currency: 'UBI',
    type: 'UBI_DISTRIBUTION',
  }), { headers });
  
  const txDuration = new Date() - startTime;
  transactionDuration.add(txDuration);
  
  check(txRes, {
    'transaction created': (r) => r.status === 201,
    'transaction duration < 500ms': () => txDuration < 500,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Get transaction history
  let historyRes = http.get(`${BASE_URL}/api/transactions/account/${accountsRes.json('data[0].id')}`, {
    headers,
  });
  
  check(historyRes, {
    'get history successful': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(2);
  
  // Browse tasks
  let tasksRes = http.get(`${BASE_URL}/api/tasks?limit=20`, { headers });
  
  check(tasksRes, {
    'get tasks successful': (r) => r.status === 200,
    'tasks loaded quickly': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Get UBI distribution info
  let ubiRes = http.get(`${BASE_URL}/api/ubi/next-distribution`, { headers });
  
  check(ubiRes, {
    'get UBI info successful': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(2);
}

export function teardown(data) {
  // Cleanup: Delete test users
  console.log('Tearing down load test...');
  
  for (const user of data.users) {
    http.del(`${BASE_URL}/api/users/${user.username}`);
  }
}

export function handleSummary(data) {
  return {
    'performance-results/summary.json': JSON.stringify(data),
    'performance-results/summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options?.indent || '';
  const enableColors = options?.enableColors || false;
  
  let summary = `${indent}Test Summary:\n`;
  summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}  Avg Duration: ${data.metrics.http_req_duration.values.avg}ms\n`;
  summary += `${indent}  P95 Duration: ${data.metrics['http_req_duration{p(95)}']}ms\n`;
  summary += `${indent}  P99 Duration: ${data.metrics['http_req_duration{p(99)}']}ms\n`;
  
  return summary;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Load Test Results</h1>
  <h2>Summary</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>Total Requests</td>
      <td>${data.metrics.http_reqs.values.count}</td>
      <td class="pass">✓</td>
    </tr>
    <tr>
      <td>Failed Requests</td>
      <td>${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</td>
      <td class="${data.metrics.http_req_failed.values.rate < 0.01 ? 'pass' : 'fail'}">
        ${data.metrics.http_req_failed.values.rate < 0.01 ? '✓' : '✗'}
      </td>
    </tr>
    <tr>
      <td>Avg Response Time</td>
      <td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
      <td class="pass">✓</td>
    </tr>
    <tr>
      <td>P95 Response Time</td>
      <td>${data.metrics['http_req_duration{p(95)}'].toFixed(2)}ms</td>
      <td class="${data.metrics['http_req_duration{p(95)}'] < 500 ? 'pass' : 'fail'}">
        ${data.metrics['http_req_duration{p(95)}'] < 500 ? '✓' : '✗'}
      </td>
    </tr>
    <tr>
      <td>P99 Response Time</td>
      <td>${data.metrics['http_req_duration{p(99)}'].toFixed(2)}ms</td>
      <td class="${data.metrics['http_req_duration{p(99)}'] < 1000 ? 'pass' : 'fail'}">
        ${data.metrics['http_req_duration{p(99)}'] < 1000 ? '✓' : '✗'}
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
