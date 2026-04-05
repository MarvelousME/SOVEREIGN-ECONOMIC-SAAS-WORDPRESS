'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Block, LandingPage } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Sparkles,
  Globe,
  Loader2,
  Edit3,
  Eye,
  CheckCircle,
  AlertCircle,
  FileText,
  Layout,
  Star,
  MessageSquare,
  DollarSign,
  HelpCircle,
  LinkIcon,
  AlertTriangle,
} from 'lucide-react';

const blockIcons: Record<string, typeof Layout> = {
  hero: Layout,
  features: Star,
  cta: MessageSquare,
  testimonials: MessageSquare,
  pricing: DollarSign,
  faq: HelpCircle,
  footer: LinkIcon,
  affiliate_disclosure: AlertTriangle,
};

export default function GeneratorPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<LandingPage | null>(null);
  const [editing, setEditing] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError(null);
    setGenerated(null);

    try {
      const page = await api.generatePage(parsedUrl.toString());
      setGenerated(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate page');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handlePublish = async () => {
    if (!generated) return;
    try {
      const published = await api.publishPage(generated.id);
      router.push('/dashboard/pages');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const handleEdit = () => {
    if (!generated) return;
    router.push(`/dashboard/pages/editor/${generated.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/pages"
          className="p-2 hover:bg-accent rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">AI Page Generator</h1>
          <p className="text-sm text-muted-foreground">
            Generate landing pages from any URL using AI
          </p>
        </div>
      </div>

      <div className="p-6 bg-card rounded-lg border">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="https://example.com/landing-page"
              className="w-full pl-10 pr-4 py-3 bg-background border rounded-lg text-base"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Page
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {generated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{generated.title}</h2>
              <p className="text-sm text-muted-foreground">
                {generated.description || 'AI-generated landing page'}
              </p>
            </div>
            <div className="flex gap-2">
              {generated.status === 'draft' && (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handlePublish}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Publish
                  </button>
                </>
              )}
              {generated.status === 'published' && (
                <Link
                  href={`/${generated.slug}`}
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Eye className="w-4 h-4" />
                  View Live
                </Link>
              )}
            </div>
          </div>

          <div className="p-4 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Generated Blocks ({generated.blocks?.length || 0})
            </h3>
            <div className="grid gap-2">
              {generated.blocks?.map((block, i) => {
                const Icon = blockIcons[block.type] || FileText;
                return (
                  <div
                    key={block.id || i}
                    className="flex items-center gap-3 p-3 bg-background rounded-lg"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="flex-1 text-sm">
                      {block.type.charAt(0).toUpperCase() + block.type.slice(1).replace('_', ' ')}
                    </span>
                    {block.content && Object.keys(block.content).length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {Object.keys(block.content).length} fields
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Preview</h3>
            <div className="space-y-4">
              {generated.blocks?.slice(0, 3).map((block, i) => (
                <div key={block.id || i} className="p-6 bg-background rounded-lg">
                  {block.type === 'hero' && (
                    <div className="text-center">
                      <h1 className="text-2xl font-bold mb-2">
                        {block.content.title as string || 'Hero Title'}
                      </h1>
                      <p className="text-muted-foreground">
                        {block.content.subtitle as string || 'Subtitle'}
                      </p>
                    </div>
                  )}
                  {block.type === 'features' && (
                    <div>
                      <h2 className="text-lg font-semibold mb-3">
                        {block.content.title as string || 'Features'}
                      </h2>
                      <div className="grid grid-cols-2 gap-2">
                        {((block.content.features as Array<{ title: string }>) || []).slice(0, 3).map((f, j) => (
                          <div key={j} className="p-2 bg-card rounded">
                            {f.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {block.type !== 'hero' && block.type !== 'features' && (
                    <p className="text-sm text-muted-foreground">
                      {block.type.charAt(0).toUpperCase() + block.type.slice(1).replace('_', ' ')} block
                    </p>
                  )}
                </div>
              ))}
              {(generated.blocks?.length || 0) > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  + {(generated.blocks?.length || 0) - 3} more blocks
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!generated && !loading && (
        <div className="flex flex-col items-center justify-center h-64 bg-card rounded-lg border border-dashed">
          <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No page generated yet</h3>
          <p className="text-sm text-muted-foreground">
            Enter a URL above to generate a landing page using AI
          </p>
        </div>
      )}
    </div>
  );
}
