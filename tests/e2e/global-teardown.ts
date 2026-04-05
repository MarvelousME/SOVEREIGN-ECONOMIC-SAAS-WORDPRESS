import { FullConfig } from '@playwright/test';
import { getDbHelper } from '../helpers/database.helper';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('Running E2E global teardown...');

  const dbHelper = getDbHelper();

  try {
    // Clean database
    await dbHelper.cleanDatabase();
    await dbHelper.close();

    // Clean up auth files
    const authDir = path.join(process.cwd(), 'playwright', '.auth');
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }

    console.log('E2E global teardown completed');
  } catch (error) {
    console.error('E2E global teardown failed:', error);
  }
}

export default globalTeardown;
