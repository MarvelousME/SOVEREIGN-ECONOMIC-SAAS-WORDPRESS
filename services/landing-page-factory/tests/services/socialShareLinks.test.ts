import { buildSocialShareLinks } from '../../src/services/socialShareLinks';

describe('buildSocialShareLinks', () => {
  it('returns intent URLs containing encoded page URL', () => {
    const url = 'https://cdn.example.com/pages/t1/p1/summer-sale';
    const links = buildSocialShareLinks(url, 'Summer drop');

    expect(links.twitter).toContain(encodeURIComponent(url));
    expect(links.facebook).toContain(encodeURIComponent(url));
    expect(links.linkedin).toContain(encodeURIComponent(url));
    expect(links.x).toContain('x.com/intent/tweet');
    expect(links.whatsapp).toContain('api.whatsapp.com');
    expect(links.email).toContain('mailto:');
  });

  it('truncates long text', () => {
    const long = 'x'.repeat(400);
    const links = buildSocialShareLinks('https://a.com/b', long);
    expect(links.twitter).toMatch(/text=/);
    expect(decodeURIComponent(links.twitter.split('text=')[1] || '')).toHaveLength(280);
  });
});
