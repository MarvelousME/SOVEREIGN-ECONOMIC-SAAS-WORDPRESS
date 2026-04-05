import { test, expect } from '@playwright/test';

test.describe('UBI Distribution E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create UBI distribution pool', async ({ page }) => {
    await page.goto('/admin/ubi/pools');
    
    await page.click('button:has-text("Create Pool")');
    
    await page.fill('input[name="name"]', 'Weekly UBI Pool');
    await page.fill('input[name="totalAmount"]', '10000');
    await page.selectOption('select[name="algorithm"]', 'ACTIVITY_WEIGHTED');
    await page.fill('input[name="distributionDate"]', '2024-12-31');
    
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Pool created successfully')).toBeVisible();
    await expect(page.locator('text=Weekly UBI Pool')).toBeVisible();
  });

  test('should calculate and preview distribution', async ({ page }) => {
    await page.goto('/admin/ubi/pools');
    
    await page.click('text=Weekly UBI Pool');
    await page.click('button:has-text("Calculate Distribution")');

    // Wait for calculation to complete
    await expect(page.locator('text=Calculation Complete')).toBeVisible({ timeout: 30000 });

    // Check preview
    await page.click('button:has-text("Preview")');
    
    const recipientCount = await page.locator('[data-testid="recipient-count"]').textContent();
    expect(parseInt(recipientCount || '0')).toBeGreaterThan(0);

    const totalDistributed = await page.locator('[data-testid="total-distributed"]').textContent();
    expect(totalDistributed).toContain('10000');
  });

  test('should execute UBI distribution', async ({ page }) => {
    await page.goto('/admin/ubi/pools');
    
    await page.click('text=Weekly UBI Pool');
    await page.click('button:has-text("Execute Distribution")');

    // Confirm distribution
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=Distribution started')).toBeVisible();
    
    // Wait for distribution to complete
    await expect(
      page.locator('text=Distribution completed'),
      { timeout: 60000 }
    ).toBeVisible();

    // Verify status
    const status = await page.locator('[data-testid="pool-status"]').textContent();
    expect(status).toBe('DISTRIBUTED');
  });

  test('should show user received UBI in their account', async ({ page }) => {
    // Logout admin
    await page.click('button[aria-label="Logout"]');

    // Login as regular user
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await page.goto('/wallet');

    // Check for UBI transaction
    await expect(page.locator('text=UBI Distribution')).toBeVisible();
    
    const balance = await page.locator('[data-testid="ubi-balance"]').textContent();
    expect(parseFloat(balance || '0')).toBeGreaterThan(0);
  });

  test('should apply anti-abuse detection', async ({ page }) => {
    await page.goto('/admin/ubi/anti-abuse');

    // Check detected suspicious accounts
    const suspiciousCount = await page.locator('[data-testid="suspicious-accounts"]').count();
    
    if (suspiciousCount > 0) {
      await page.click('[data-testid="suspicious-account"]:first-child');
      
      // View details
      await expect(page.locator('text=Abuse Score')).toBeVisible();
      
      // Mark as verified or ban
      await page.click('button:has-text("Review")');
      await page.selectOption('select[name="action"]', 'BAN');
      await page.fill('textarea[name="reason"]', 'Multiple accounts detected');
      await page.click('button:has-text("Submit")');

      await expect(page.locator('text=Account banned')).toBeVisible();
    }
  });

  test('should show distribution analytics', async ({ page }) => {
    await page.goto('/admin/ubi/analytics');

    // Check charts are rendered
    await expect(page.locator('[data-testid="distribution-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="recipient-chart"]')).toBeVisible();
    
    // Check metrics
    await expect(page.locator('text=Total Distributed')).toBeVisible();
    await expect(page.locator('text=Active Recipients')).toBeVisible();
    await expect(page.locator('text=Average Distribution')).toBeVisible();
  });
});
