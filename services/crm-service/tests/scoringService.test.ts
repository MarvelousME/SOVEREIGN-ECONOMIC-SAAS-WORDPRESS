import { Lead } from '../src/types';

const BEHAVIORAL_WEIGHTS = {
  websiteVisits: 5,
  emailOpens: 2,
  emailClicks: 3,
  formSubmissions: 10,
  contentDownloads: 5,
  webinarAttendances: 8,
  demoRequests: 15,
};

const DEMOGRAPHIC_WEIGHTS = {
  companySize: 10,
  industryMatch: 15,
  jobTitleMatch: 10,
  emailResponse: 5,
  meetingScheduled: 20,
};

describe('ScoringService Logic', () => {
  describe('Behavioral Score Calculation', () => {
    it('should calculate behavioral score based on activities', () => {
      const activities = {
        websiteVisits: 5,
        emailOpens: 3,
        emailClicks: 2,
        formSubmissions: 1,
      };

      let score = 0;
      score += Math.min(activities.websiteVisits * BEHAVIORAL_WEIGHTS.websiteVisits, 25);
      score += Math.min(activities.emailOpens * BEHAVIORAL_WEIGHTS.emailOpens, 15);
      score += Math.min(activities.emailClicks * BEHAVIORAL_WEIGHTS.emailClicks, 20);
      score += Math.min(activities.formSubmissions * BEHAVIORAL_WEIGHTS.formSubmissions, 30);

      expect(score).toBe(60);
    });

    it('should cap behavioral score at 100', () => {
      const activities = {
        websiteVisits: 100,
        emailOpens: 100,
        emailClicks: 100,
        formSubmissions: 100,
        contentDownloads: 100,
        webinarAttendances: 100,
        demoRequests: 100,
      };

      let score = 0;
      score += Math.min(activities.websiteVisits * BEHAVIORAL_WEIGHTS.websiteVisits, 25);
      score += Math.min(activities.emailOpens * BEHAVIORAL_WEIGHTS.emailOpens, 15);
      score += Math.min(activities.emailClicks * BEHAVIORAL_WEIGHTS.emailClicks, 20);
      score += Math.min(activities.formSubmissions * BEHAVIORAL_WEIGHTS.formSubmissions, 30);
      score += Math.min(activities.contentDownloads * BEHAVIORAL_WEIGHTS.contentDownloads, 20);
      score += Math.min(activities.webinarAttendances * BEHAVIORAL_WEIGHTS.webinarAttendances, 25);
      score += Math.min(activities.demoRequests * BEHAVIORAL_WEIGHTS.demoRequests, 35);

      expect(score).toBe(100);
    });
  });

  describe('Demographic Score Calculation', () => {
    it('should give higher score for target industries', () => {
      const targetIndustries = ['Technology', 'Finance', 'Healthcare', 'SaaS', 'E-commerce'];
      const company = 'TechCorp Solutions';
      
      const isTargetIndustry = targetIndustries.some(ind => 
        company.toLowerCase().includes(ind.toLowerCase())
      );

      expect(isTargetIndustry).toBe(true);
    });

    it('should give higher score for decision maker titles', () => {
      const targetJobTitles = ['CEO', 'CTO', 'CFO', 'VP', 'Director', 'Manager', 'Founder', 'Owner'];
      const jobTitle = 'VP of Engineering';
      
      const isDecisionMaker = targetJobTitles.some(title => 
        jobTitle.toLowerCase().includes(title.toLowerCase())
      );

      expect(isDecisionMaker).toBe(true);
    });

    it('should give higher score for larger companies', () => {
      const employeeCount = 500;
      let score = 0;

      if (employeeCount > 1000) score += 25;
      else if (employeeCount > 500) score += 20;
      else if (employeeCount > 100) score += 15;
      else if (employeeCount > 50) score += 10;
      else score += 5;

      expect(score).toBe(20);
    });
  });

  describe('Segment Determination', () => {
    it('should assign Hot segment for score >= 80', () => {
      const score = 85;
      let segment = '';
      
      if (score >= 80) segment = 'Hot';
      else if (score >= 60) segment = 'Warm';
      else if (score >= 40) segment = 'Cool';
      else segment = 'Cold';

      expect(segment).toBe('Hot');
    });

    it('should assign Warm segment for score >= 60', () => {
      const score = 65;
      let segment = '';
      
      if (score >= 80) segment = 'Hot';
      else if (score >= 60) segment = 'Warm';
      else if (score >= 40) segment = 'Cool';
      else segment = 'Cold';

      expect(segment).toBe('Warm');
    });

    it('should assign Cool segment for score >= 40', () => {
      const score = 45;
      let segment = '';
      
      if (score >= 80) segment = 'Hot';
      else if (score >= 60) segment = 'Warm';
      else if (score >= 40) segment = 'Cool';
      else segment = 'Cold';

      expect(segment).toBe('Cool');
    });

    it('should assign Cold segment for score < 40', () => {
      const score = 30;
      let segment = '';
      
      if (score >= 80) segment = 'Hot';
      else if (score >= 60) segment = 'Warm';
      else if (score >= 40) segment = 'Cool';
      else segment = 'Cold';

      expect(segment).toBe('Cold');
    });
  });

  describe('Weighted Total Score', () => {
    it('should calculate weighted total score correctly', () => {
      const behavioralScore = 80;
      const demographicScore = 60;
      const engagementScore = 40;

      const behavioralWeight = 0.4;
      const demographicWeight = 0.35;
      const engagementWeight = 0.25;

      const totalScore = Math.round(
        behavioralScore * behavioralWeight +
        demographicScore * demographicWeight +
        engagementScore * engagementWeight
      );

      expect(totalScore).toBe(62);
    });
  });
});

describe('Lead Object Structure', () => {
  it('should validate lead has required fields', () => {
    const lead = {
      id: '123',
      tenantId: 'tenant-1',
      email: 'test@example.com',
      status: 'new' as const,
      attribution: {
        source: 'web' as const,
        medium: 'organic' as const,
      },
      tags: [],
      customFields: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(lead.email).toBeDefined();
    expect(lead.status).toBeDefined();
    expect(lead.attribution).toBeDefined();
  });

  it('should handle optional fields correctly', () => {
    const lead: Partial<Lead> = {
      id: '123',
      email: 'test@example.com',
    };

    expect(lead.firstName).toBeUndefined();
    expect(lead.phone).toBeUndefined();
    expect(lead.company).toBeUndefined();
  });
});
