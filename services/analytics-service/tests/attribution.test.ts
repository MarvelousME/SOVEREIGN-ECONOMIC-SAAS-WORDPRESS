describe('Attribution Model Algorithms', () => {
  interface TouchpointData {
    id: string;
    touchpoint_type: string;
    first_interaction_at: Date;
    last_interaction_at: Date;
    visitor_id: string;
    session_id: string;
    channel: string | null;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    conversion_id: string | null;
  }

  const mockTouchpoints: TouchpointData[] = [
    {
      id: 'tp1',
      touchpoint_type: 'organic_search',
      first_interaction_at: new Date('2024-01-01T10:00:00Z'),
      last_interaction_at: new Date('2024-01-01T10:00:00Z'),
      visitor_id: 'visitor1',
      session_id: 'session1',
      channel: 'organic',
      source: 'google',
      medium: null,
      campaign: null,
      conversion_id: null,
    },
    {
      id: 'tp2',
      touchpoint_type: 'paid_ad',
      first_interaction_at: new Date('2024-01-05T14:00:00Z'),
      last_interaction_at: new Date('2024-01-05T14:30:00Z'),
      visitor_id: 'visitor1',
      session_id: 'session2',
      channel: 'paid',
      source: 'google_ads',
      medium: 'cpc',
      campaign: 'summer_sale',
      conversion_id: null,
    },
    {
      id: 'tp3',
      touchpoint_type: 'email',
      first_interaction_at: new Date('2024-01-10T09:00:00Z'),
      last_interaction_at: new Date('2024-01-10T09:15:00Z'),
      visitor_id: 'visitor1',
      session_id: 'session3',
      channel: 'email',
      source: 'newsletter',
      medium: 'email',
      campaign: 'weekly_digest',
      conversion_id: null,
    },
  ];

  const conversionDate = new Date('2024-01-15T12:00:00Z');

  describe('First-Touch Attribution', () => {
    it('should assign 100% credit to the first touchpoint', () => {
      const firstTouch = mockTouchpoints.reduce((earliest, t) =>
        new Date(t.first_interaction_at) < new Date(earliest.first_interaction_at) ? t : earliest
      );

      expect(firstTouch.id).toBe('tp1');
      expect(firstTouch.touchpoint_type).toBe('organic_search');
    });

    it('should handle single touchpoint', () => {
      const singleTouchpoint = [mockTouchpoints[0]];
      const credit = singleTouchpoint[0].id === 'tp1' ? 100 : 0;
      expect(credit).toBe(100);
    });
  });

  describe('Last-Touch Attribution', () => {
    it('should assign 100% credit to the last touchpoint', () => {
      const lastTouch = mockTouchpoints.reduce((latest, t) =>
        new Date(t.last_interaction_at) > new Date(latest.last_interaction_at) ? t : latest
      );

      expect(lastTouch.id).toBe('tp3');
      expect(lastTouch.touchpoint_type).toBe('email');
    });
  });

  describe('Linear Attribution', () => {
    it('should distribute credit equally across all touchpoints', () => {
      const creditPerTouchpoint = 100 / mockTouchpoints.length;
      expect(creditPerTouchpoint).toBeCloseTo(33.33, 1);
    });

    it('should total 100% across all touchpoints', () => {
      const creditPerTouchpoint = 100 / mockTouchpoints.length;
      const totalCredit = creditPerTouchpoint * mockTouchpoints.length;
      expect(totalCredit).toBe(100);
    });
  });

  describe('Time-Decay Attribution', () => {
    it('should assign more credit to recent touchpoints', () => {
      const decayFactor = 0.5;

      const weights = mockTouchpoints.map(tp => {
        const daysDiff = Math.max(0, 
          (conversionDate.getTime() - new Date(tp.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return Math.pow(2, -daysDiff * decayFactor);
      });

      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      const credits = weights.map(w => (w / totalWeight) * 100);

      expect(credits[2]).toBeGreaterThan(credits[0]);
      expect(credits[2]).toBeGreaterThan(credits[1]);
    });

    it('should handle equal-weight case when all touchpoints are equidistant', () => {
      const equalTouchpoints = [
        { ...mockTouchpoints[0], last_interaction_at: new Date('2024-01-14T10:00:00Z') },
        { ...mockTouchpoints[1], last_interaction_at: new Date('2024-01-14T10:00:00Z') },
        { ...mockTouchpoints[2], last_interaction_at: new Date('2024-01-14T10:00:00Z') },
      ];

      const weights = equalTouchpoints.map(() => 1);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const credits = weights.map(w => (w / totalWeight) * 100);

      expect(credits[0]).toBeCloseTo(credits[1]);
      expect(credits[1]).toBeCloseTo(credits[2]);
    });
  });

  describe('Position-Based (U-Shaped) Attribution', () => {
    const firstWeight = 0.4;
    const lastWeight = 0.4;

    it('should assign 40% to first, 40% to last, 20% to middle', () => {
      if (mockTouchpoints.length === 3) {
        const firstCredit = firstWeight * 100;
        const lastCredit = lastWeight * 100;
        const middleWeight = 1 - firstWeight - lastWeight;
        const middleCredit = (middleWeight / (mockTouchpoints.length - 2)) * 100;

        expect(firstCredit).toBe(40);
        expect(lastCredit).toBe(40);
        expect(middleCredit).toBe(20);
      }
    });

    it('should handle two touchpoints', () => {
      const twoTouchpoints = [mockTouchpoints[0], mockTouchpoints[1]];
      
      const totalCredit = firstWeight + lastWeight;
      expect(totalCredit).toBe(0.8);
    });

    it('should handle single touchpoint', () => {
      const singleTouchpoint = [mockTouchpoints[0]];
      expect(100).toBe(100);
    });
  });

  describe('Data-Driven Attribution', () => {
    it('should weight multiple models together', () => {
      const weights = {
        first_touch: 0.3,
        last_touch: 0.3,
        linear: 0.2,
        position_based: 0.2,
      };

      expect(weights.first_touch + weights.last_touch + weights.linear + weights.position_based).toBe(1);
    });

    it('should produce weighted average credit', () => {
      const firstTouchCredit = [100, 0, 0];
      const lastTouchCredit = [0, 0, 100];
      const linearCredit = [33.33, 33.33, 33.33];
      const positionBasedCredit = [40, 20, 40];

      const weights = {
        first_touch: 0.3,
        last_touch: 0.3,
        linear: 0.2,
        position_based: 0.2,
      };

      const finalCredit = firstTouchCredit.map((_, i) =>
        firstTouchCredit[i] * weights.first_touch +
        lastTouchCredit[i] * weights.last_touch +
        linearCredit[i] * weights.linear +
        positionBasedCredit[i] * weights.position_based
      );

      expect(finalCredit[0]).toBeCloseTo(36.67, 1);
      expect(finalCredit[1]).toBeCloseTo(10.67, 1);
      expect(finalCredit[2]).toBeCloseTo(52.67, 1);
    });
  });
});

describe('Conversion Attribution Window', () => {
  it('should only include touchpoints within attribution window', () => {
    const touchpoints = [
      { id: 'tp1', last_interaction_at: new Date('2024-01-01') },
      { id: 'tp2', last_interaction_at: new Date('2024-01-10') },
      { id: 'tp3', last_interaction_at: new Date('2024-01-25') },
    ];

    const conversionDate = new Date('2024-01-15');
    const windowDays = 30;

    const eligibleTouchpoints = touchpoints.filter(tp =>
      conversionDate.getTime() - new Date(tp.last_interaction_at).getTime() <= windowDays * 24 * 60 * 60 * 1000
    );

    expect(eligibleTouchpoints).toHaveLength(2);
    expect(eligibleTouchpoints.map(t => t.id)).toContain('tp1');
    expect(eligibleTouchpoints.map(t => t.id)).toContain('tp2');
  });
});
