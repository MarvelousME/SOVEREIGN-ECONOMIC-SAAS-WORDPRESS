import { BusinessTemplate, TemplateDefinition, PageType } from '../types';

export const BUSINESS_TEMPLATES: Record<BusinessTemplate, TemplateDefinition> = {
  [BusinessTemplate.ECOMMERCE]: {
    id: BusinessTemplate.ECOMMERCE,
    name: 'E-commerce Store',
    description: 'Complete online store with product catalog, shopping cart, and checkout',
    category: 'Retail',
    features: [
      'Product catalog with categories',
      'Shopping cart & checkout',
      'Payment processing (Stripe/PayPal)',
      'Order management',
      'Customer accounts',
      'Inventory tracking',
      'Email notifications',
    ],
    defaultPages: [
      {
        type: PageType.LANDING,
        title: 'Home',
        slug: 'home',
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            config: {
              heading: 'Welcome to Our Store',
              subheading: 'Discover amazing products at great prices',
              ctaText: 'Shop Now',
              ctaLink: '/products',
              backgroundType: 'gradient',
            },
          },
          {
            id: 'features-1',
            type: 'features',
            config: {
              title: 'Why Shop With Us',
              items: [
                { icon: 'truck', title: 'Free Shipping', description: 'On orders over $50' },
                { icon: 'shield', title: 'Secure Payment', description: '100% secure transactions' },
                { icon: 'clock', title: 'Fast Delivery', description: '2-3 business days' },
              ],
            },
          },
          {
            id: 'gallery-1',
            type: 'gallery',
            config: {
              title: 'Featured Products',
              layout: 'grid',
              columns: 3,
            },
          },
        ],
      },
      {
        type: PageType.CHECKOUT,
        title: 'Checkout',
        slug: 'checkout',
        components: [
          {
            id: 'form-1',
            type: 'form',
            config: {
              title: 'Complete Your Order',
              fields: [
                { name: 'email', type: 'email', label: 'Email', required: true },
                { name: 'name', type: 'text', label: 'Full Name', required: true },
                { name: 'address', type: 'text', label: 'Shipping Address', required: true },
                { name: 'city', type: 'text', label: 'City', required: true },
                { name: 'postalCode', type: 'text', label: 'Postal Code', required: true },
              ],
              submitText: 'Proceed to Payment',
            },
          },
        ],
      },
      {
        type: PageType.THANK_YOU,
        title: 'Thank You',
        slug: 'thank-you',
        components: [
          {
            id: 'hero-2',
            type: 'hero',
            config: {
              heading: 'Order Confirmed!',
              subheading: 'Thank you for your purchase. You will receive a confirmation email shortly.',
              ctaText: 'Continue Shopping',
              ctaLink: '/products',
            },
          },
        ],
      },
    ],
    defaultFunnel: {
      name: 'E-commerce Sales Funnel',
      pages: [],
      emailSequences: [
        {
          id: 'welcome-sequence',
          name: 'Welcome Series',
          trigger: 'signup',
          delay: 0,
          emails: [
            {
              id: 'email-1',
              subject: 'Welcome to {{business_name}}!',
              body: 'Thank you for joining us. Here is a special 10% discount code: WELCOME10',
              delayAfterPrevious: 0,
            },
            {
              id: 'email-2',
              subject: 'Discover Our Best Sellers',
              body: 'Check out our most popular products that customers love.',
              delayAfterPrevious: 2880, // 2 days
            },
          ],
        },
        {
          id: 'abandoned-cart',
          name: 'Abandoned Cart Recovery',
          trigger: 'abandoned_cart',
          delay: 60,
          emails: [
            {
              id: 'email-3',
              subject: 'You left something in your cart',
              body: 'Complete your purchase and get free shipping!',
              delayAfterPrevious: 0,
            },
          ],
        },
      ],
      conversionGoal: 'purchase',
    },
    pricing: {
      isFree: true,
    },
    estimatedSetupTime: 30,
  },

  [BusinessTemplate.SERVICE_MARKETPLACE]: {
    id: BusinessTemplate.SERVICE_MARKETPLACE,
    name: 'Service Marketplace',
    description: 'Platform connecting service providers with customers',
    category: 'Services',
    features: [
      'Service provider profiles',
      'Service listings & categories',
      'Booking system',
      'Payment processing',
      'Review & rating system',
      'Messaging system',
      'Commission-based revenue',
    ],
    defaultPages: [
      {
        type: PageType.LANDING,
        title: 'Find Services',
        slug: 'home',
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            config: {
              heading: 'Find the Perfect Service Provider',
              subheading: 'Connect with verified professionals in your area',
              ctaText: 'Browse Services',
              ctaLink: '/services',
            },
          },
          {
            id: 'features-1',
            type: 'features',
            config: {
              title: 'How It Works',
              items: [
                { icon: 'search', title: 'Search', description: 'Find the service you need' },
                { icon: 'calendar', title: 'Book', description: 'Schedule at your convenience' },
                { icon: 'check', title: 'Done', description: 'Get the job done right' },
              ],
            },
          },
        ],
      },
    ],
    defaultFunnel: {
      name: 'Service Booking Funnel',
      pages: [],
      emailSequences: [],
      conversionGoal: 'booking',
    },
    pricing: {
      isFree: true,
    },
    estimatedSetupTime: 45,
  },

  [BusinessTemplate.LEAD_GENERATION]: {
    id: BusinessTemplate.LEAD_GENERATION,
    name: 'Lead Generation Funnel',
    description: 'High-converting landing page with lead capture',
    category: 'Marketing',
    features: [
      'High-converting landing page',
      'Lead capture forms',
      'Email automation',
      'A/B testing',
      'Analytics & tracking',
      'CRM integration',
      'Lead scoring',
    ],
    defaultPages: [
      {
        type: PageType.LANDING,
        title: 'Get Your Free Guide',
        slug: 'home',
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            config: {
              heading: 'Transform Your Business Today',
              subheading: 'Download our free guide and learn the secrets to success',
              ctaText: 'Get Free Guide',
              ctaLink: '#form',
            },
          },
          {
            id: 'form-1',
            type: 'form',
            config: {
              title: 'Enter Your Details',
              fields: [
                { name: 'name', type: 'text', label: 'Full Name', required: true },
                { name: 'email', type: 'email', label: 'Email Address', required: true },
                { name: 'company', type: 'text', label: 'Company', required: false },
              ],
              submitText: 'Download Now',
            },
          },
        ],
      },
      {
        type: PageType.THANK_YOU,
        title: 'Download Your Guide',
        slug: 'thank-you',
        components: [
          {
            id: 'hero-2',
            type: 'hero',
            config: {
              heading: 'Success! Check Your Email',
              subheading: 'We have sent your free guide to your email address',
            },
          },
        ],
      },
    ],
    defaultFunnel: {
      name: 'Lead Nurture Funnel',
      pages: [],
      emailSequences: [
        {
          id: 'nurture-sequence',
          name: 'Lead Nurture',
          trigger: 'signup',
          delay: 0,
          emails: [
            {
              id: 'email-1',
              subject: 'Here is your free guide',
              body: 'Thank you for downloading our guide. Here is the link: {{download_link}}',
              delayAfterPrevious: 0,
            },
            {
              id: 'email-2',
              subject: 'Did you find the guide helpful?',
              body: 'Let us know what you thought and discover more resources.',
              delayAfterPrevious: 1440, // 1 day
            },
          ],
        },
      ],
      conversionGoal: 'lead_capture',
    },
    pricing: {
      isFree: true,
    },
    estimatedSetupTime: 20,
  },

  [BusinessTemplate.MEMBERSHIP_SITE]: {
    id: BusinessTemplate.MEMBERSHIP_SITE,
    name: 'Membership Site',
    description: 'Subscription-based membership platform with exclusive content',
    category: 'Education',
    features: [
      'Member registration & login',
      'Tiered membership levels',
      'Recurring billing',
      'Content access control',
      'Member dashboard',
      'Community features',
      'Email notifications',
    ],
    defaultPages: [
      {
        type: PageType.LANDING,
        title: 'Join Our Community',
        slug: 'home',
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            config: {
              heading: 'Access Exclusive Content',
              subheading: 'Join thousands of members and unlock premium resources',
              ctaText: 'View Plans',
              ctaLink: '#pricing',
            },
          },
          {
            id: 'pricing-1',
            type: 'pricing',
            config: {
              title: 'Choose Your Plan',
              plans: [
                {
                  name: 'Basic',
                  price: 9.99,
                  interval: 'month',
                  features: ['Access to basic content', 'Community forum', 'Monthly newsletter'],
                },
                {
                  name: 'Pro',
                  price: 29.99,
                  interval: 'month',
                  features: ['All Basic features', 'Premium content', 'Live Q&A sessions', 'Priority support'],
                  highlighted: true,
                },
              ],
            },
          },
        ],
      },
    ],
    defaultFunnel: {
      name: 'Membership Funnel',
      pages: [],
      emailSequences: [],
      conversionGoal: 'subscription',
    },
    pricing: {
      isFree: true,
    },
    estimatedSetupTime: 40,
  },

  [BusinessTemplate.COURSE_PLATFORM]: {
    id: BusinessTemplate.COURSE_PLATFORM,
    name: 'Course Platform',
    description: 'Online course platform with video lessons and progress tracking',
    category: 'Education',
    features: [
      'Course catalog',
      'Video lessons',
      'Progress tracking',
      'Quizzes & assessments',
      'Certificates',
      'Student dashboard',
      'Drip content delivery',
    ],
    defaultPages: [
      {
        type: PageType.LANDING,
        title: 'Learn New Skills',
        slug: 'home',
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            config: {
              heading: 'Master New Skills Online',
              subheading: 'Expert-led courses to advance your career',
              ctaText: 'Browse Courses',
              ctaLink: '/courses',
            },
          },
        ],
      },
    ],
    defaultFunnel: {
      name: 'Course Enrollment Funnel',
      pages: [],
      emailSequences: [],
      conversionGoal: 'course_purchase',
    },
    pricing: {
      isFree: true,
    },
    estimatedSetupTime: 50,
  },

  [BusinessTemplate.BOOKING_SCHEDULING]: {
    id: BusinessTemplate.BOOKING_SCHEDULING,
    name: 'Booking & Scheduling',
    description: 'Appointment booking system with calendar integration',
    category: 'Services',
    features: [
      'Calendar booking',
      'Service selection',
      'Staff management',
      'Automated reminders',
      'Payment processing',
      'Google Calendar sync',
      'Customer management',
    ],
    defaultPages: [
      {
        type: PageType.LANDING,
        title: 'Book Your Appointment',
        slug: 'home',
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            config: {
              heading: 'Easy Online Booking',
              subheading: 'Schedule your appointment in seconds',
              ctaText: 'Book Now',
              ctaLink: '/book',
            },
          },
        ],
      },
    ],
    defaultFunnel: {
      name: 'Booking Funnel',
      pages: [],
      emailSequences: [],
      conversionGoal: 'booking',
    },
    pricing: {
      isFree: true,
    },
    estimatedSetupTime: 35,
  },

  [BusinessTemplate.AFFILIATE_PROGRAM]: {
    id: BusinessTemplate.AFFILIATE_PROGRAM,
    name: 'Affiliate Program',
    description: 'Complete affiliate marketing platform with tracking and payouts',
    category: 'Marketing',
    features: [
      'Affiliate registration',
      'Unique tracking links',
      'Commission tracking',
      'Automated payouts',
      'Affiliate dashboard',
      'Marketing materials',
      'Performance analytics',
    ],
    defaultPages: [
      {
        type: PageType.LANDING,
        title: 'Become an Affiliate',
        slug: 'home',
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            config: {
              heading: 'Earn Money Promoting Great Products',
              subheading: 'Join our affiliate program and earn up to 30% commission',
              ctaText: 'Join Now',
              ctaLink: '/signup',
            },
          },
          {
            id: 'features-1',
            type: 'features',
            config: {
              title: 'Why Join Us',
              items: [
                { icon: 'dollar', title: 'High Commissions', description: 'Earn up to 30% per sale' },
                { icon: 'chart', title: 'Real-time Tracking', description: 'Monitor your performance' },
                { icon: 'clock', title: 'Quick Payouts', description: 'Get paid monthly' },
              ],
            },
          },
        ],
      },
    ],
    defaultFunnel: {
      name: 'Affiliate Recruitment Funnel',
      pages: [],
      emailSequences: [],
      conversionGoal: 'affiliate_signup',
    },
    pricing: {
      isFree: true,
    },
    estimatedSetupTime: 40,
  },
};

export function getTemplate(id: BusinessTemplate): TemplateDefinition | null {
  return BUSINESS_TEMPLATES[id] || null;
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(BUSINESS_TEMPLATES);
}

export function getTemplatesByCategory(category: string): TemplateDefinition[] {
  return Object.values(BUSINESS_TEMPLATES).filter((t) => t.category === category);
}
