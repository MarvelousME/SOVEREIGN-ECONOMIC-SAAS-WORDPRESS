import { chromium, FullConfig } from '@playwright/test';
import { getDbHelper } from '../helpers/database.helper';
import { UserFactory } from '../factories/user.factory';
import { AccountFactory } from '../factories/account.factory';

async function globalSetup(config: FullConfig) {
  console.log('Running E2E global setup...');

  const dbHelper = getDbHelper();

  try {
    // Clean database
    await dbHelper.cleanDatabase();

    // Seed test data
    const adminUser = UserFactory.create({
      username: 'admin',
      email: 'admin@test.com',
    });

    const testUser = UserFactory.create({
      username: 'testuser',
      email: 'test@example.com',
    });

    const adminAccount = AccountFactory.createUserAccount(adminUser.id, '10000');
    const testAccount = AccountFactory.createUserAccount(testUser.id, '1000');

    await dbHelper.seedDatabase({
      users: [adminUser, testUser],
      accounts: [adminAccount, testAccount],
    });

    console.log('Test data seeded successfully');

    // Create admin session
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Perform admin login and save session
    await page.goto(process.env.BASE_URL || 'http://localhost:3000');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Save admin auth state
    await context.storageState({ path: 'playwright/.auth/admin.json' });

    // Create user session
    await context.clearCookies();
    await page.goto(process.env.BASE_URL || 'http://localhost:3000');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Save user auth state
    await context.storageState({ path: 'playwright/.auth/user.json' });

    await browser.close();

    console.log('E2E global setup completed');
  } catch (error) {
    console.error('E2E global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
