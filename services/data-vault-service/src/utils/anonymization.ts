import { AnonymizationLevel, AnonymizedData } from '../types';

/**
 * Anonymization engine for data privacy
 */
export class AnonymizationService {
  /**
   * Anonymize data based on level
   */
  anonymize(data: Record<string, any>, level: AnonymizationLevel): AnonymizedData {
    const result: AnonymizedData = {
      data: { ...data },
      anonymizationLevel: level,
      fieldsRemoved: [],
      fieldsGeneralized: []
    };

    switch (level) {
      case AnonymizationLevel.NONE:
        // No anonymization
        break;

      case AnonymizationLevel.LOW:
        // Remove direct identifiers
        result.data = this.removePII(result.data, result.fieldsRemoved);
        break;

      case AnonymizationLevel.MEDIUM:
        // Remove PII and generalize quasi-identifiers
        result.data = this.removePII(result.data, result.fieldsRemoved);
        result.data = this.generalizeData(result.data, result.fieldsGeneralized);
        break;

      case AnonymizationLevel.HIGH:
        // Heavy anonymization - only aggregated data
        result.data = this.aggregateData(result.data, result.fieldsRemoved);
        break;

      case AnonymizationLevel.FULL:
        // Fully anonymous - statistical only
        result.data = this.statisticalOnly(result.data);
        result.fieldsRemoved = Object.keys(data);
        break;
    }

    return result;
  }

  /**
   * Remove Personally Identifiable Information
   */
  private removePII(data: Record<string, any>, removedFields: string[]): Record<string, any> {
    const piiFields = [
      'email',
      'phone',
      'phoneNumber',
      'ssn',
      'socialSecurityNumber',
      'passport',
      'driversLicense',
      'fullName',
      'name',
      'address',
      'street',
      'city',
      'zipCode',
      'postalCode',
      'ipAddress',
      'creditCard',
      'bankAccount'
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

  /**
   * Generalize quasi-identifiers
   */
  private generalizeData(data: Record<string, any>, generalizedFields: string[]): Record<string, any> {
    const result = { ...data };

    // Generalize age to age ranges
    if ('age' in result && typeof result.age === 'number') {
      result.age = this.generalizeAge(result.age);
      generalizedFields.push('age');
    }

    // Generalize dates to year only
    if ('birthDate' in result) {
      const date = new Date(result.birthDate);
      result.birthYear = date.getFullYear();
      delete result.birthDate;
      generalizedFields.push('birthDate');
    }

    // Generalize location to region
    if ('location' in result) {
      result.region = this.generalizeLocation(result.location);
      delete result.location;
      generalizedFields.push('location');
    }

    // Generalize income to ranges
    if ('income' in result && typeof result.income === 'number') {
      result.incomeRange = this.generalizeIncome(result.income);
      delete result.income;
      generalizedFields.push('income');
    }

    return result;
  }

  /**
   * Generalize age to ranges
   */
  private generalizeAge(age: number): string {
    if (age < 18) return '< 18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }

  /**
   * Generalize location to region
   */
  private generalizeLocation(location: string): string {
    // Simple implementation - would need proper geocoding in production
    return location.split(',').slice(-1)[0].trim(); // Return country only
  }

  /**
   * Generalize income to ranges
   */
  private generalizeIncome(income: number): string {
    if (income < 25000) return '< $25k';
    if (income < 50000) return '$25k-$50k';
    if (income < 75000) return '$50k-$75k';
    if (income < 100000) return '$75k-$100k';
    if (income < 150000) return '$100k-$150k';
    return '$150k+';
  }

  /**
   * Aggregate data - remove all individual data points
   */
  private aggregateData(data: Record<string, any>, removedFields: string[]): Record<string, any> {
    // In production, this would return aggregated statistics
    // For now, return only non-sensitive counts and averages
    const result: Record<string, any> = {};

    // Keep only aggregatable fields
    const aggregatableFields = ['activityCount', 'transactionCount', 'averageRating'];
    
    aggregatableFields.forEach(field => {
      if (field in data) {
        result[field] = data[field];
      }
    });

    // Mark all other fields as removed
    Object.keys(data).forEach(key => {
      if (!(key in result)) {
        removedFields.push(key);
      }
    });

    return result;
  }

  /**
   * Statistical only - convert to pure statistics
   */
  private statisticalOnly(data: Record<string, any>): Record<string, any> {
    // Return only statistical summary
    return {
      recordCount: 1,
      dataPointsAvailable: Object.keys(data).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if data meets k-anonymity requirement
   * Validates that each quasi-identifier combination appears at least k times
   */
  checkKAnonymity(
    quasiIdentifiers: string[],
    dataset: Record<string, any>[],
    k: number = 5
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

  /**
   * Suppress records that don't meet k-anonymity
   * Removes records with quasi-identifier combinations appearing less than k times
   */
  suppressRecordsForKAnonymity(
    dataset: Record<string, any>[],
    quasiIdentifiers: string[],
    k: number
  ): { anonymizedDataset: Record<string, any>[]; suppressedCount: number } {
    const frequencyMap = new Map<string, number[]>();

    dataset.forEach((record, index) => {
      const key = quasiIdentifiers.map((qid) => {
        const value = record[qid];
        return value !== undefined && value !== null ? String(value) : 'NULL';
      }).join(',');

      if (!frequencyMap.has(key)) {
        frequencyMap.set(key, []);
      }
      frequencyMap.get(key)!.push(index);
    });

    const indicesToKeep = new Set<number>();
    let suppressedCount = 0;

    frequencyMap.forEach((indices) => {
      if (indices.length >= k) {
        indices.forEach((i) => indicesToKeep.add(i));
      } else {
        suppressedCount += indices.length;
      }
    });

    const anonymizedDataset = dataset.filter((_, index) => indicesToKeep.has(index));

    return { anonymizedDataset, suppressedCount };
  }

  /**
   * Apply differential privacy noise
   */
  addDifferentialPrivacyNoise(value: number, epsilon: number = 0.1): number {
    // Laplace mechanism for differential privacy
    const scale = 1 / epsilon;
    const noise = this.laplacianNoise(scale);
    return value + noise;
  }

  /**
   * Generate Laplacian noise
   */
  private laplacianNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}

export const anonymizationService = new AnonymizationService();
