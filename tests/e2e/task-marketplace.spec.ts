import { test, expect } from '@playwright/test';

test.describe('Task Marketplace E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete full task lifecycle', async ({ page }) => {
    // Step 1: Create a task
    await page.goto('/tasks/create');
    
    await page.fill('input[name="title"]', 'Test Task');
    await page.fill('textarea[name="description"]', 'Complete this test task');
    await page.fill('input[name="reward"]', '100');
    await page.selectOption('select[name="category"]', 'GENERAL');
    
    await page.click('button:has-text("Create Task")');
    
    await expect(page.locator('text=Task created successfully')).toBeVisible();

    // Step 2: Claim the task (as another user)
    await page.click('button[aria-label="Logout"]');
    await page.goto('/login');
    await page.fill('input[name="username"]', 'claimeruser');
    await page.fill('input[name="password"]', 'ClaimerPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/tasks');
    await page.click('text=Test Task');
    await page.click('button:has-text("Claim Task")');
    
    await expect(page.locator('text=Task claimed')).toBeVisible();

    // Step 3: Submit proof
    await page.goto('/tasks/my-tasks');
    await page.click('text=Test Task');
    
    await page.setInputFiles('input[type="file"]', {
      name: 'proof.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image data'),
    });
    
    await page.fill('textarea[name="notes"]', 'Task completed as requested');
    await page.click('button:has-text("Submit Proof")');
    
    await expect(page.locator('text=Proof submitted')).toBeVisible();

    // Step 4: Approve task (as creator)
    await page.click('button[aria-label="Logout"]');
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await page.goto('/tasks/my-created-tasks');
    await page.click('text=Test Task');
    
    await expect(page.locator('[data-testid="proof-image"]')).toBeVisible();
    
    await page.click('button:has-text("Approve")');
    await page.fill('textarea[name="feedback"]', 'Great work!');
    await page.click('button:has-text("Confirm Approval")');
    
    await expect(page.locator('text=Task approved')).toBeVisible();

    // Step 5: Verify reward received (switch back to claimer)
    await page.click('button[aria-label="Logout"]');
    await page.goto('/login');
    await page.fill('input[name="username"]', 'claimeruser');
    await page.fill('input[name="password"]', 'ClaimerPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/wallet');
    
    await expect(page.locator('text=Task Reward')).toBeVisible();
    await expect(page.locator('text=+100 UBI')).toBeVisible();
  });

  test('should handle task rejection', async ({ page }) => {
    // Create and claim task (abbreviated)
    await page.goto('/tasks/create');
    await page.fill('input[name="title"]', 'Rejection Test');
    await page.fill('textarea[name="description"]', 'This will be rejected');
    await page.fill('input[name="reward"]', '50');
    await page.click('button:has-text("Create Task")');

    // Submit proof with wrong content
    await page.goto('/tasks/my-tasks');
    await page.click('text=Rejection Test');
    await page.fill('textarea[name="notes"]', 'Wrong submission');
    await page.click('button:has-text("Submit Proof")');

    // Reject as creator
    await page.goto('/tasks/my-created-tasks');
    await page.click('text=Rejection Test');
    await page.click('button:has-text("Reject")');
    await page.fill('textarea[name="reason"]', 'Does not meet requirements');
    await page.click('button:has-text("Confirm Rejection")');

    await expect(page.locator('text=Task rejected')).toBeVisible();

    // Verify task status
    const status = await page.locator('[data-testid="task-status"]').textContent();
    expect(status).toBe('REJECTED');
  });

  test('should search and filter tasks', async ({ page }) => {
    await page.goto('/tasks');

    // Search by keyword
    await page.fill('input[name="search"]', 'development');
    await page.click('button:has-text("Search")');

    const results = await page.locator('[data-testid="task-card"]').count();
    expect(results).toBeGreaterThan(0);

    // Filter by category
    await page.selectOption('select[name="category"]', 'DEVELOPMENT');
    
    // Filter by reward range
    await page.fill('input[name="minReward"]', '50');
    await page.fill('input[name="maxReward"]', '500');
    
    await page.click('button:has-text("Apply Filters")');

    // Verify filtered results
    await expect(page.locator('[data-testid="task-card"]').first()).toBeVisible();
  });

  test('should show task analytics', async ({ page }) => {
    await page.goto('/tasks/analytics');

    // Check metrics
    await expect(page.locator('text=Tasks Created')).toBeVisible();
    await expect(page.locator('text=Tasks Completed')).toBeVisible();
    await expect(page.locator('text=Success Rate')).toBeVisible();
    await expect(page.locator('text=Total Rewards Paid')).toBeVisible();

    // Check charts
    await expect(page.locator('[data-testid="tasks-over-time-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-distribution-chart"]')).toBeVisible();
  });
});
