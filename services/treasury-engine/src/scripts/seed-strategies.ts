import { pool } from '../config/database';
import { StrategyRepository } from '../repositories/strategy.repository';
import { ALL_STRATEGIES } from '../utils/strategy-definitions';

async function seedStrategies() {
  try {
    console.log('Seeding strategies...');
    const strategyRepo = new StrategyRepository(pool);

    for (const strategyData of ALL_STRATEGIES) {
      const existing = await strategyRepo.getStrategiesByType(strategyData.type);
      const alreadyExists = existing.some(s => s.name === strategyData.name);

      if (!alreadyExists) {
        const strategy = await strategyRepo.createStrategy(strategyData);
        console.log(`✓ Created strategy: ${strategy.name} (${strategy.id})`);
      } else {
        console.log(`- Strategy already exists: ${strategyData.name}`);
      }
    }

    console.log('Strategy seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed strategies:', error);
    process.exit(1);
  }
}

seedStrategies();
