import { config } from '../src/config';

describe('Config', () => {
  it('should have default port', () => {
    expect(config.port).toBeDefined();
    expect(typeof config.port).toBe('number');
  });

  it('should have database configuration', () => {
    expect(config.database).toBeDefined();
    expect(config.database.host).toBeDefined();
    expect(config.database.port).toBeDefined();
    expect(config.database.username).toBeDefined();
    expect(config.database.password).toBeDefined();
    expect(config.database.name).toBeDefined();
  });

  it('should have scoring weights', () => {
    expect(config.scoring).toBeDefined();
    expect(config.scoring.behavioralWeight).toBeDefined();
    expect(config.scoring.demographicWeight).toBeDefined();
    expect(config.scoring.engagementWeight).toBeDefined();

    const totalWeight = 
      config.scoring.behavioralWeight + 
      config.scoring.demographicWeight + 
      config.scoring.engagementWeight;
    expect(totalWeight).toBeCloseTo(1, 5);
  });

  it('should have routing configuration', () => {
    expect(config.routing).toBeDefined();
    expect(config.routing.defaultTerritory).toBeDefined();
    expect(config.routing.maxLeadsPerUser).toBeDefined();
  });

  it('should have node environment', () => {
    expect(config.nodeEnv).toBeDefined();
    expect(['development', 'production', 'test']).toContain(config.nodeEnv);
  });
});
