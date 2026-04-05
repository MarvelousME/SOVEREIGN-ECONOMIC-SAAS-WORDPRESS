import { AnonymizationLevel } from '../types';

class TestAnonymizationService {
  anonymize(data: Record<string, unknown>, level: number): {
    data: Record<string, unknown>;
    anonymizationLevel: number;
    fieldsRemoved: string[];
    fieldsGeneralized: string[];
  } {
    const result = {
      data: { ...data },
      anonymizationLevel: level,
      fieldsRemoved: [] as string[],
      fieldsGeneralized: [] as string[]
    };

    switch (level) {
      case AnonymizationLevel.NONE:
        break;
      case AnonymizationLevel.LOW:
        result.data = this.removePII(result.data, result.fieldsRemoved);
        break;
      case AnonymizationLevel.MEDIUM:
        result.data = this.removePII(result.data, result.fieldsRemoved);
        result.data = this.generalizeData(result.data, result.fieldsGeneralized);
        break;
      case AnonymizationLevel.HIGH:
        result.data = this.aggregateData(result.data, result.fieldsRemoved);
        break;
      case AnonymizationLevel.FULL:
        result.data = this.statisticalOnly(result.data);
        result.fieldsRemoved = Object.keys(data);
        break;
    }

    return result;
  }

  private removePII(data: Record<string, unknown>, removedFields: string[]): Record<string, unknown> {
    const piiFields = [
      'email', 'phone', 'phoneNumber', 'ssn', 'socialSecurityNumber',
      'passport', 'driversLicense', 'fullName', 'name', 'address',
      'street', 'city', 'zipCode', 'postalCode', 'ipAddress',
      'creditCard', 'bankAccount'
    ];

    const result = { ...data };

    piiFields.forEach(field => {
      if (field in result) {
        delete result[field];
        removedFields.push(field);
      }
    });

    return result;
  }

  private generalizeData(data: Record<string, unknown>, generalizedFields: string[]): Record<string, unknown> {
    const result = { ...data };

    if ('age' in result && typeof result.age === 'number') {
      result.age = this.generalizeAge(result.age) as unknown;
      generalizedFields.push('age');
    }

    if ('birthDate' in result) {
      const date = new Date(result.birthDate as string);
      result.birthYear = date.getFullYear() as unknown;
      delete result.birthDate;
      generalizedFields.push('birthDate');
    }

    if ('location' in result) {
      result.region = this.generalizeLocation(result.location as string) as unknown;
      delete result.location;
      generalizedFields.push('location');
    }

    if ('income' in result && typeof result.income === 'number') {
      result.incomeRange = this.generalizeIncome(result.income) as unknown;
      delete result.income;
      generalizedFields.push('income');
    }

    return result;
  }

  private generalizeAge(age: number): string {
    if (age < 18) return '< 18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }

  private generalizeLocation(location: string): string {
    return location.split(',').slice(-1)[0].trim();
  }

  private generalizeIncome(income: number): string {
    if (income < 25000) return '< $25k';
    if (income < 50000) return '$25k-$50k';
    if (income < 75000) return '$50k-$75k';
    if (income < 100000) return '$75k-$100k';
    if (income < 150000) return '$100k-$150k';
    return '$150k+';
  }

  private aggregateData(data: Record<string, unknown>, removedFields: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const aggregatableFields = ['activityCount', 'transactionCount', 'averageRating'];

    aggregatableFields.forEach(field => {
      if (field in data) {
        result[field] = data[field];
      }
    });

    Object.keys(data).forEach(key => {
      if (!(key in result)) {
        removedFields.push(key);
      }
    });

    return result;
  }

  private statisticalOnly(data: Record<string, unknown>): Record<string, unknown> {
    return {
      recordCount: 1,
      dataPointsAvailable: Object.keys(data).length,
      timestamp: new Date().toISOString()
    };
  }

  checkKAnonymity(
    quasiIdentifiers: string[],
    dataset: Record<string, unknown>[],
    k: number
  ): { meetsKAnonymity: boolean; suppressionNeeded: string[] } {
    const frequencyMap = new Map<string, number>();
    const suppressionNeeded: string[] = [];

    dataset.forEach((record) => {
      const key = quasiIdentifiers.map((qid) => {
        const value = record[qid];
        return value !== undefined && value !== null ? String(value) : 'NULL';
      }).join(',');

      frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
    });

    let meetsKAnonymity = true;
    frequencyMap.forEach((count, key) => {
      if (count < k) {
        meetsKAnonymity = false;
        suppressionNeeded.push(key);
      }
    });

    return { meetsKAnonymity, suppressionNeeded };
  }

  suppressRecordsForKAnonymity(
    dataset: Record<string, unknown>[],
    quasiIdentifiers: string[],
    k: number
  ): { anonymizedDataset: Record<string, unknown>[]; suppressedCount: number } {
    const frequencyMap = new Map<string, number[]>();

    dataset.forEach((record, idx) => {
      const key = quasiIdentifiers.map((qid) => {
        const value = record[qid];
        return value !== undefined && value !== null ? String(value) : 'NULL';
      }).join(',');

      if (!frequencyMap.has(key)) {
        frequencyMap.set(key, []);
      }
      frequencyMap.get(key)!.push(idx);
    });

    const indicesToKeep = new Set<number>();
    let suppressedCount = 0;

    frequencyMap.forEach((indices) => {
      if (indices.length >= k) {
        indices.forEach(i => indicesToKeep.add(i));
      } else {
        suppressedCount += indices.length;
      }
    });

    const anonymizedDataset = dataset.filter((_, index) => indicesToKeep.has(index));

    return { anonymizedDataset, suppressedCount };
  }

  addDifferentialPrivacyNoise(value: number, epsilon: number = 0.1): number {
    const scale = 1 / epsilon;
    const u = Math.random() - 0.5;
    return value + (-scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)));
  }
}

describe('AnonymizationService', () => {
  let anonymizationService: TestAnonymizationService;

  beforeEach(() => {
    anonymizationService = new TestAnonymizationService();
  });

  describe('anonymize', () => {
    describe('AnonymizationLevel.NONE', () => {
      it('should return data unchanged', () => {
        const data: Record<string, unknown> = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          city: 'New York'
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.NONE);

        expect(result.data).toEqual(data);
        expect(result.anonymizationLevel).toBe(AnonymizationLevel.NONE);
        expect(result.fieldsRemoved).toHaveLength(0);
        expect(result.fieldsGeneralized).toHaveLength(0);
      });
    });

    describe('AnonymizationLevel.LOW', () => {
      it('should remove direct PII identifiers', () => {
        const data: Record<string, unknown> = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          age: 30,
          city: 'New York'
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.LOW);

        expect(result.data.name).toBeUndefined();
        expect(result.data.email).toBeUndefined();
        expect(result.data.phone).toBeUndefined();
        expect(result.data.age).toBe(30);
        expect(result.fieldsRemoved).toContain('name');
        expect(result.fieldsRemoved).toContain('email');
        expect(result.fieldsRemoved).toContain('phone');
      });

      it('should not modify non-PII fields', () => {
        const data: Record<string, unknown> = {
          age: 30,
          activityCount: 100,
          preferences: ['reading', 'gaming']
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.LOW);

        expect(result.data.age).toBe(30);
        expect(result.data.activityCount).toBe(100);
        expect(result.data.preferences).toEqual(['reading', 'gaming']);
      });

      it('should handle data with no PII fields', () => {
        const data: Record<string, unknown> = {
          age: 25,
          activityCount: 50
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.LOW);

        expect(result.data).toEqual(data);
        expect(result.fieldsRemoved).toHaveLength(0);
      });
    });

    describe('AnonymizationLevel.MEDIUM', () => {
      it('should remove PII and generalize quasi-identifiers', () => {
        const data: Record<string, unknown> = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 33,
          birthDate: '1990-06-15',
          location: 'New York, USA',
          income: 85000
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.MEDIUM);

        expect(result.data.name).toBeUndefined();
        expect(result.data.email).toBeUndefined();
        expect(result.data.age).toBe('25-34');
        expect(result.data.birthYear).toBe(1990);
        expect(result.data.birthDate).toBeUndefined();
        expect(result.data.region).toBe('USA');
        expect(result.data.location).toBeUndefined();
        expect(result.data.income).toBeUndefined();
        expect(result.data.incomeRange).toBe('$75k-$100k');
      });

      it('should track removed and generalized fields', () => {
        const data: Record<string, unknown> = {
          fullName: 'John Doe',
          ssn: '123-45-6789',
          age: 28
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.MEDIUM);

        expect(result.fieldsRemoved).toContain('fullName');
        expect(result.fieldsRemoved).toContain('ssn');
        expect(result.fieldsGeneralized).toContain('age');
      });
    });

    describe('AnonymizationLevel.HIGH', () => {
      it('should return only aggregated data', () => {
        const data: Record<string, unknown> = {
          name: 'John Doe',
          email: 'john@example.com',
          activityCount: 100,
          transactionCount: 25,
          averageRating: 4.5
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.HIGH);

        expect(result.data.name).toBeUndefined();
        expect(result.data.email).toBeUndefined();
        expect(result.data.activityCount).toBe(100);
        expect(result.data.transactionCount).toBe(25);
        expect(result.data.averageRating).toBe(4.5);
        expect(result.fieldsRemoved).toContain('name');
        expect(result.fieldsRemoved).toContain('email');
      });

      it('should mark all non-aggregatable fields as removed', () => {
        const data: Record<string, unknown> = {
          ipAddress: '192.168.1.1',
          phone: '555-1234',
          activityCount: 50
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.HIGH);

        expect(result.data.activityCount).toBe(50);
        expect(result.fieldsRemoved).toContain('ipAddress');
        expect(result.fieldsRemoved).toContain('phone');
      });
    });

    describe('AnonymizationLevel.FULL', () => {
      it('should return only statistical summary', () => {
        const data: Record<string, unknown> = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        };

        const result = anonymizationService.anonymize(data, AnonymizationLevel.FULL);

        expect(result.data.recordCount).toBe(1);
        expect(result.data.dataPointsAvailable).toBe(3);
        expect(result.data).toHaveProperty('timestamp');
        expect(result.data.name).toBeUndefined();
        expect(result.fieldsRemoved).toEqual(['name', 'email', 'age']);
      });
    });
  });

  describe('generalizeAge', () => {
    const testCases = [
      { input: 10, expected: '< 18' },
      { input: 18, expected: '18-24' },
      { input: 20, expected: '18-24' },
      { input: 25, expected: '25-34' },
      { input: 30, expected: '25-34' },
      { input: 35, expected: '35-44' },
      { input: 44, expected: '35-44' },
      { input: 45, expected: '45-54' },
      { input: 50, expected: '45-54' },
      { input: 55, expected: '55-64' },
      { input: 60, expected: '55-64' },
      { input: 65, expected: '65+' },
      { input: 70, expected: '65+' },
      { input: 100, expected: '65+' }
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should generalize age ${input} to "${expected}"`, () => {
        const result = anonymizationService.anonymize({ age: input }, AnonymizationLevel.MEDIUM);
        expect(result.data.age).toBe(expected);
      });
    });
  });

  describe('generalizeIncome', () => {
    const testCases = [
      { input: 10000, expected: '< $25k' },
      { input: 25000, expected: '$25k-$50k' },
      { input: 30000, expected: '$25k-$50k' },
      { input: 50000, expected: '$50k-$75k' },
      { input: 60000, expected: '$50k-$75k' },
      { input: 75000, expected: '$75k-$100k' },
      { input: 80000, expected: '$75k-$100k' },
      { input: 100000, expected: '$100k-$150k' },
      { input: 120000, expected: '$100k-$150k' },
      { input: 150000, expected: '$150k+' },
      { input: 200000, expected: '$150k+' }
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should generalize income ${input} to "${expected}"`, () => {
        const result = anonymizationService.anonymize({ income: input }, AnonymizationLevel.MEDIUM);
        expect(result.data.incomeRange).toBe(expected);
      });
    });
  });

  describe('generalizeLocation', () => {
    it('should extract country from location string', () => {
      const testCases = [
        { input: 'New York, USA', expected: 'USA' },
        { input: 'London, UK', expected: 'UK' },
        { input: 'Paris, France', expected: 'France' },
        { input: 'Tokyo, Japan', expected: 'Japan' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = anonymizationService.anonymize({ location: input }, AnonymizationLevel.MEDIUM);
        expect(result.data.region).toBe(expected);
      });
    });

    it('should handle location with extra spaces', () => {
      const result = anonymizationService.anonymize({ location: 'Berlin ,  Germany  ' }, AnonymizationLevel.MEDIUM);
      expect(result.data.region).toBe('Germany');
    });
  });

  describe('checkKAnonymity', () => {
    it('should correctly identify records that do not meet k-anonymity', () => {
      const dataset = [
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 35, zipCode: '54321' },
        { age: 35, zipCode: '54321' }
      ];
      const quasiIdentifiers = ['age', 'zipCode'];

      const result = anonymizationService.checkKAnonymity(quasiIdentifiers, dataset, 5);

      expect(result.meetsKAnonymity).toBe(false);
      expect(result.suppressionNeeded).toContain('30,12345');
      expect(result.suppressionNeeded).toContain('35,54321');
    });

    it('should return true when all groups meet k threshold', () => {
      const dataset = [
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 35, zipCode: '54321' },
        { age: 35, zipCode: '54321' },
        { age: 35, zipCode: '54321' },
        { age: 35, zipCode: '54321' },
        { age: 35, zipCode: '54321' }
      ];
      const quasiIdentifiers = ['age', 'zipCode'];

      const result = anonymizationService.checkKAnonymity(quasiIdentifiers, dataset, 5);

      expect(result.meetsKAnonymity).toBe(true);
      expect(result.suppressionNeeded).toHaveLength(0);
    });

    it('should handle mixed groups with some meeting k and some not', () => {
      const dataset = [
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 35, zipCode: '54321' },
        { age: 35, zipCode: '54321' }
      ];
      const quasiIdentifiers = ['age', 'zipCode'];

      const result = anonymizationService.checkKAnonymity(quasiIdentifiers, dataset, 5);

      expect(result.meetsKAnonymity).toBe(false);
      expect(result.suppressionNeeded).toContain('35,54321');
      expect(result.suppressionNeeded).not.toContain('30,12345');
    });

    it('should handle null and undefined values', () => {
      const dataset = [
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: 30, zipCode: '12345' },
        { age: null, zipCode: '54321' },
        { age: undefined, zipCode: '54321' }
      ];
      const quasiIdentifiers = ['age', 'zipCode'];

      const result = anonymizationService.checkKAnonymity(quasiIdentifiers, dataset, 5);

      expect(result.meetsKAnonymity).toBe(false);
    });
  });

  describe('suppressRecordsForKAnonymity', () => {
    it('should remove records that do not meet k-anonymity threshold', () => {
      const dataset = [
        { id: 1, age: 30, zipCode: '12345' },
        { id: 2, age: 30, zipCode: '12345' },
        { id: 3, age: 30, zipCode: '12345' },
        { id: 4, age: 35, zipCode: '54321' },
        { id: 5, age: 35, zipCode: '54321' }
      ];
      const quasiIdentifiers = ['age', 'zipCode'];

      const result = anonymizationService.suppressRecordsForKAnonymity(dataset, quasiIdentifiers, 3);

      expect(result.anonymizedDataset).toHaveLength(3);
      expect(result.suppressedCount).toBe(2);
      expect(result.anonymizedDataset.every(r => r.age === 30)).toBe(true);
    });

    it('should return all records when all meet k-anonymity', () => {
      const dataset = [
        { id: 1, age: 30, zipCode: '12345' },
        { id: 2, age: 30, zipCode: '12345' },
        { id: 3, age: 30, zipCode: '12345' },
        { id: 4, age: 35, zipCode: '54321' },
        { id: 5, age: 35, zipCode: '54321' },
        { id: 6, age: 35, zipCode: '54321' }
      ];
      const quasiIdentifiers = ['age', 'zipCode'];

      const result = anonymizationService.suppressRecordsForKAnonymity(dataset, quasiIdentifiers, 3);

      expect(result.anonymizedDataset).toHaveLength(6);
      expect(result.suppressedCount).toBe(0);
    });

    it('should handle edge case of k=1', () => {
      const dataset = [
        { id: 1, age: 30 },
        { id: 2, age: 35 }
      ];
      const quasiIdentifiers = ['age'];

      const result = anonymizationService.suppressRecordsForKAnonymity(dataset, quasiIdentifiers, 1);

      expect(result.anonymizedDataset).toHaveLength(2);
      expect(result.suppressedCount).toBe(0);
    });
  });

  describe('addDifferentialPrivacyNoise', () => {
    it('should add noise to the original value', () => {
      const originalValue = 100;
      const noisyValue = anonymizationService.addDifferentialPrivacyNoise(originalValue, 0.1);

      expect(noisyValue).not.toBe(originalValue);
    });

    it('should add larger noise for smaller epsilon on average', () => {
      const originalValue = 100;
      const iterations = 100;
      
      let sumNoiseSmallEpsilon = 0;
      let sumNoiseLargeEpsilon = 0;
      
      for (let i = 0; i < iterations; i++) {
        sumNoiseSmallEpsilon += Math.abs(originalValue - anonymizationService.addDifferentialPrivacyNoise(originalValue, 0.1));
        sumNoiseLargeEpsilon += Math.abs(originalValue - anonymizationService.addDifferentialPrivacyNoise(originalValue, 1.0));
      }

      const avgNoiseSmallEpsilon = sumNoiseSmallEpsilon / iterations;
      const avgNoiseLargeEpsilon = sumNoiseLargeEpsilon / iterations;

      expect(avgNoiseSmallEpsilon).toBeGreaterThan(avgNoiseLargeEpsilon);
    });

    it('should return a number type', () => {
      const result = anonymizationService.addDifferentialPrivacyNoise(50, 0.5);
      expect(typeof result).toBe('number');
    });

    it('should handle zero and negative values', () => {
      expect(typeof anonymizationService.addDifferentialPrivacyNoise(0, 0.1)).toBe('number');
      expect(typeof anonymizationService.addDifferentialPrivacyNoise(-50, 0.1)).toBe('number');
    });
  });

  describe('removePII', () => {
    const piiFields = [
      'email', 'phone', 'phoneNumber', 'ssn', 'socialSecurityNumber',
      'passport', 'driversLicense', 'fullName', 'name', 'address',
      'street', 'city', 'zipCode', 'postalCode', 'ipAddress',
      'creditCard', 'bankAccount'
    ];

    it('should remove all known PII fields', () => {
      const data: Record<string, unknown> = {};
      piiFields.forEach(field => {
        data[field] = 'test value';
      });
      data['nonPiiField'] = 'keep this';

      const result = anonymizationService.anonymize(data, AnonymizationLevel.LOW);

      piiFields.forEach(field => {
        expect(result.data[field]).toBeUndefined();
      });
      expect(result.data['nonPiiField']).toBe('keep this');
    });

    it('should be case-sensitive for field matching', () => {
      const data: Record<string, unknown> = {
        email: 'test@example.com',
        Email: 'Test@Example.com',
        EMAIL: 'TEST@EXAMPLE.COM'
      };

      const result = anonymizationService.anonymize(data, AnonymizationLevel.LOW);

      expect(result.data.email).toBeUndefined();
      expect(result.data.Email).toBe('Test@Example.com');
      expect(result.data.EMAIL).toBe('TEST@EXAMPLE.COM');
    });
  });
});
