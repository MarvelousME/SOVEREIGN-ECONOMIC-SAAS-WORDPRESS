describe('Anomaly Detection', () => {
  describe('Z-Score Calculation', () => {
    it('should detect anomalies beyond z-threshold', () => {
      const mean = 100;
      const stddev = 15;
      const current = 145;
      const zThreshold = 2.5;

      const zScore = (current - mean) / stddev;
      const isAnomaly = Math.abs(zScore) > zThreshold;

      expect(zScore).toBeCloseTo(3, 0);
      expect(isAnomaly).toBe(true);
    });

    it('should not flag values within normal range', () => {
      const mean = 100;
      const stddev = 15;
      const current = 110;
      const zThreshold = 2.5;

      const zScore = (current - mean) / stddev;
      const isAnomaly = Math.abs(zScore) > zThreshold;

      expect(zScore).toBeCloseTo(0.67, 1);
      expect(isAnomaly).toBe(false);
    });

    it('should handle zero stddev gracefully', () => {
      const mean = 100;
      const stddev = 0;
      const current = 110;

      const zScore = stddev === 0 ? 0 : (current - mean) / stddev;
      expect(zScore).toBe(0);
    });
  });

  describe('Deviation Percentage', () => {
    it('should calculate correct deviation percentage', () => {
      const mean = 100;
      const current = 150;

      const deviationPercentage = ((current - mean) / mean) * 100;
      expect(deviationPercentage).toBe(50);
    });

    it('should handle negative deviations', () => {
      const mean = 100;
      const current = 50;

      const deviationPercentage = ((current - mean) / mean) * 100;
      expect(deviationPercentage).toBe(-50);
    });

    it('should handle zero mean', () => {
      const mean = 0;
      const current = 50;

      const deviationPercentage = mean !== 0 ? ((current - mean) / mean) * 100 : 0;
      expect(deviationPercentage).toBe(0);
    });
  });

  describe('Trend Analysis', () => {
    interface DataPoint {
      timestamp: Date;
      value: number;
    }

    function calculateLinearRegression(points: DataPoint[]): { slope: number; volatility: number } {
      const n = points.length;
      const xMean = (n - 1) / 2;
      const yMean = points.reduce((sum, p) => sum + p.value, 0) / n;

      let numerator = 0;
      let denominator = 0;
      let squaredDiffs = 0;

      for (let i = 0; i < n; i++) {
        const xDiff = i - xMean;
        const yDiff = points[i].value - yMean;
        numerator += xDiff * yDiff;
        denominator += xDiff * xDiff;
      }

      const slope = denominator !== 0 ? numerator / denominator : 0;

      for (let i = 0; i < n; i++) {
        const predicted = yMean + slope * (i - xMean);
        squaredDiffs += Math.pow(points[i].value - predicted, 2);
      }
      const volatility = Math.sqrt(squaredDiffs / n);

      return { slope, volatility };
    }

    it('should detect increasing trend', () => {
      const points: DataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 110 },
        { timestamp: new Date('2024-01-03'), value: 120 },
        { timestamp: new Date('2024-01-04'), value: 130 },
      ];

      const { slope } = calculateLinearRegression(points);
      expect(slope).toBeGreaterThan(0);
    });

    it('should detect decreasing trend', () => {
      const points: DataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 130 },
        { timestamp: new Date('2024-01-02'), value: 120 },
        { timestamp: new Date('2024-01-03'), value: 110 },
        { timestamp: new Date('2024-01-04'), value: 100 },
      ];

      const { slope } = calculateLinearRegression(points);
      expect(slope).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const points: DataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 101 },
        { timestamp: new Date('2024-01-03'), value: 99 },
        { timestamp: new Date('2024-01-04'), value: 100 },
      ];

      const { slope } = calculateLinearRegression(points);
      expect(Math.abs(slope)).toBeLessThan(5);
    });
  });
});

describe('Statistical Significance', () => {
  function normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  function calculateStatisticalSignificance(
    treatmentConversions: number,
    treatmentSample: number,
    controlConversions: number,
    controlSample: number
  ): { confidenceLevel: number; pValue: number; isSignificant: boolean } {
    if (treatmentSample === 0 || controlSample === 0) {
      return { confidenceLevel: 0, pValue: 1, isSignificant: false };
    }

    const treatmentRate = treatmentConversions / treatmentSample;
    const controlRate = controlConversions / controlSample;

    const pooledRate = (treatmentConversions + controlConversions) / (treatmentSample + controlSample);
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / treatmentSample + 1 / controlSample)
    );

    if (standardError === 0) {
      return { confidenceLevel: 0, pValue: 1, isSignificant: false };
    }

    const zScore = (treatmentRate - controlRate) / standardError;
    const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
    const confidenceLevel = (1 - pValue) * 100;
    const isSignificant = pValue < 0.05;

    return { confidenceLevel, pValue, isSignificant };
  }

  it('should detect significant difference with large sample', () => {
    const result = calculateStatisticalSignificance(120, 1000, 100, 1000);
    expect(result.isSignificant).toBe(true);
    expect(result.confidenceLevel).toBeGreaterThan(95);
  });

  it('should not detect significance with small sample', () => {
    const result = calculateStatisticalSignificance(12, 100, 10, 100);
    expect(result.isSignificant).toBe(false);
  });

  it('should handle zero conversions', () => {
    const result = calculateStatisticalSignificance(0, 100, 0, 100);
    expect(result.isSignificant).toBe(false);
    expect(result.pValue).toBe(1);
  });
});

describe('Conversion Rate Calculations', () => {
  it('should calculate conversion rate correctly', () => {
    const totalTouchpoints = 1000;
    const totalConversions = 50;

    const conversionRate = (totalConversions / totalTouchpoints) * 100;
    expect(conversionRate).toBe(5);
  });

  it('should handle zero touchpoints', () => {
    const totalTouchpoints = 0;
    const totalConversions = 0;

    const conversionRate = totalTouchpoints > 0 ? (totalConversions / totalTouchpoints) * 100 : 0;
    expect(conversionRate).toBe(0);
  });

  it('should calculate revenue per conversion', () => {
    const totalRevenue = 5000;
    const totalConversions = 50;

    const revenuePerConversion = totalConversions > 0 ? totalRevenue / totalConversions : 0;
    expect(revenuePerConversion).toBe(100);
  });
});
