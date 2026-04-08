import OpenAI from 'openai';
import { BrandingConfig, BrandingOutput } from '../types';

export class BrandingService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateBranding(config: BrandingConfig): Promise<BrandingOutput> {
    // Generate brand strategy and guidelines
    const brandStrategy = await this.generateBrandStrategy(config);

    // Generate color scheme
    const colorScheme = await this.generateColorScheme(config, brandStrategy);

    // Generate font pairings
    const fonts = await this.generateFontPairings(config, brandStrategy);

    // Generate taglines
    const taglines = await this.generateTaglines(config, brandStrategy);

    // Generate logo (optional - requires DALL-E or external service)
    const logo = await this.generateLogo(config, brandStrategy);

    return {
      logo,
      colorScheme,
      fonts,
      tagline: taglines[0],
      alternativeTaglines: taglines.slice(1),
      brandGuidelines: brandStrategy,
    };
  }

  private async generateBrandStrategy(config: BrandingConfig): Promise<BrandingOutput['brandGuidelines']> {
    const prompt = `
You are a brand strategist. Create comprehensive brand guidelines for a business with the following details:

Business Type: ${config.businessType}
Target Audience: ${config.targetAudience}
Keywords: ${config.keywords.join(', ')}
Industry: ${config.industry || 'Not specified'}
Tone: ${config.tone || 'professional'}

Provide:
1. Brand Voice (how the brand should communicate)
2. 5 Key Messaging Points
3. 5 Things to Avoid (brand don'ts)

Format your response as JSON with keys: voice, messaging (array), doNots (array)
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert brand strategist. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  }

  private async generateColorScheme(
    config: BrandingConfig,
    strategy: BrandingOutput['brandGuidelines']
  ): Promise<BrandingOutput['colorScheme']> {
    const prompt = `
Generate a professional color scheme for a ${config.businessType} business targeting ${config.targetAudience}.

Brand Voice: ${strategy.voice}
Tone: ${config.tone || 'professional'}
Industry: ${config.industry || 'General'}

Provide 5 colors:
- primary: Main brand color (hex)
- secondary: Complementary color (hex)
- accent: Call-to-action color (hex)
- background: Background color (hex)
- text: Text color (hex)

Ensure colors are accessible (WCAG AA compliant) and match the brand tone.

Format as JSON: { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "text": "#hex" }
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a color theory expert. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  }

  private async generateFontPairings(
    config: BrandingConfig,
    strategy: BrandingOutput['brandGuidelines']
  ): Promise<BrandingOutput['fonts']> {
    const prompt = `
Recommend Google Fonts pairing for a ${config.businessType} business.

Brand Voice: ${strategy.voice}
Tone: ${config.tone || 'professional'}

Provide:
- heading: Font for headings (must be a Google Font)
- body: Font for body text (must be a Google Font)
- accent: Optional accent font (must be a Google Font)

Ensure fonts are:
- Professional and readable
- Available on Google Fonts
- Match the brand tone

Format as JSON: { "heading": "Font Name", "body": "Font Name", "accent": "Font Name" }
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a typography expert. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  }

  private async generateTaglines(config: BrandingConfig, strategy: BrandingOutput['brandGuidelines']): Promise<string[]> {
    const prompt = `
Create 5 compelling taglines for a ${config.businessType} business targeting ${config.targetAudience}.

Keywords: ${config.keywords.join(', ')}
Brand Voice: ${strategy.voice}
Key Messages: ${strategy.messaging.join(', ')}

Requirements:
- Short (3-7 words)
- Memorable
- Action-oriented or benefit-focused
- Align with brand voice

Format as JSON array: ["tagline 1", "tagline 2", ...]
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a creative copywriter. Always respond with valid JSON array only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{"taglines":[]}';
    const parsed = JSON.parse(content);
    return parsed.taglines || parsed;
  }

  private async generateLogo(
    config: BrandingConfig,
    strategy: BrandingOutput['brandGuidelines']
  ): Promise<BrandingOutput['logo']> {
    const prompt = `
Modern, minimalist logo for a ${config.businessType} business.
Style: ${config.tone || 'professional'}, clean, scalable vector graphic.
Keywords: ${config.keywords.join(', ')}.
Brand voice: ${strategy.voice}.
No text, icon only, simple shapes, flat design.
`;

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural',
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned');
      }

      // Generate variations with different styles
      const variations = await this.generateLogoVariations(prompt);

      return {
        url: imageUrl,
        prompt,
        variations,
      };
    } catch (error) {
      console.error('Logo generation failed:', error);
      // Return a placeholder if logo generation fails
      return {
        url: 'https://via.placeholder.com/512x512?text=Logo',
        prompt,
        variations: [],
      };
    }
  }

  private async generateLogoVariations(basePrompt: string): Promise<string[]> {
    const styles = [
      'geometric shapes',
      'abstract minimal',
      'lettermark design',
    ];

    const variations: string[] = [];

    for (const style of styles) {
      try {
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt: `${basePrompt} Style: ${style}`,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        });

        const url = response.data?.[0]?.url;
        if (url) {
          variations.push(url);
        }
      } catch (error) {
        console.error(`Variation generation failed for style ${style}:`, error);
      }
    }

    return variations;
  }

  async regenerateElement(
    element: 'tagline' | 'colors' | 'fonts' | 'logo',
    config: BrandingConfig,
    existingBranding?: BrandingOutput
  ): Promise<Partial<BrandingOutput>> {
    const strategy = existingBranding?.brandGuidelines || await this.generateBrandStrategy(config);

    switch (element) {
      case 'tagline':
        const taglines = await this.generateTaglines(config, strategy);
        return {
          tagline: taglines[0],
          alternativeTaglines: taglines.slice(1),
        };

      case 'colors':
        const colorScheme = await this.generateColorScheme(config, strategy);
        return { colorScheme };

      case 'fonts':
        const fonts = await this.generateFontPairings(config, strategy);
        return { fonts };

      case 'logo':
        const logo = await this.generateLogo(config, strategy);
        return { logo };

      default:
        throw new Error(`Unknown element: ${element}`);
    }
  }
}
