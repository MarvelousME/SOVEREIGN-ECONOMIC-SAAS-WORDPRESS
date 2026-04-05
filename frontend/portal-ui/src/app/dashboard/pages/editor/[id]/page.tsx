'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Block, LandingPage, PageVersion } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  History,
  Globe,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  Plus,
  X,
  Layout,
  Star,
  MessageSquare,
  DollarSign,
  HelpCircle,
  LinkIcon,
  AlertTriangle,
} from 'lucide-react';

const blockTypes = [
  { type: 'hero', label: 'Hero', icon: Layout },
  { type: 'features', label: 'Features', icon: Star },
  { type: 'cta', label: 'CTA', icon: MessageSquare },
  { type: 'testimonials', label: 'Testimonials', icon: MessageSquare },
  { type: 'pricing', label: 'Pricing', icon: DollarSign },
  { type: 'faq', label: 'FAQ', icon: HelpCircle },
  { type: 'affiliate_disclosure', label: 'Affiliate Disclosure', icon: AlertTriangle },
  { type: 'footer', label: 'Footer', icon: LinkIcon },
] as const;

function slugFromTitle(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || `page-${Date.now()}`;
}

function previewText(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

const defaultContent: Record<string, Record<string, unknown>> = {
  hero: { title: '', subtitle: '', cta_text: '', cta_link: '' },
  features: { title: '', features: [{ title: '', description: '' }] },
  cta: { title: '', description: '', button_text: '', button_link: '' },
  testimonials: { title: '', testimonials: [{ name: '', text: '', role: '' }] },
  pricing: { title: '', plans: [{ name: '', price: '', features: [], recommended: false }] },
  faq: { title: '', faqs: [{ question: '', answer: '' }] },
  footer: { text: '', links: [] },
  affiliate_disclosure: { text: '' },
};

function BlockEditor({
  block,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const blockType = blockTypes.find((b) => b.type === block.type);
  const Icon = blockType?.icon || Layout;
  const content = block.content || {};

  const updateContent = (key: string, value: unknown) => {
    onUpdate({ ...block, content: { ...content, [key]: value } });
  };

  const renderContentEditor = () => {
    switch (block.type) {
      case 'hero':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input
                type="text"
                value={(content.title as string) || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
                placeholder="Page title"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subtitle</label>
              <input
                type="text"
                value={(content.subtitle as string) || ''}
                onChange={(e) => updateContent('subtitle', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
                placeholder="Page subtitle"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">CTA Text</label>
                <input
                  type="text"
                  value={(content.cta_text as string) || ''}
                  onChange={(e) => updateContent('cta_text', e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
                  placeholder="Get Started"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">CTA Link</label>
                <input
                  type="text"
                  value={(content.cta_link as string) || ''}
                  onChange={(e) => updateContent('cta_link', e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
                  placeholder="/signup"
                />
              </div>
            </div>
          </div>
        );
      case 'features':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Section Title</label>
              <input
                type="text"
                value={(content.title as string) || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
                placeholder="Our Features"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Features</label>
              <div className="space-y-2 mt-1">
                {((content.features as Array<{ title: string; description: string }>) || []).map((feature, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => {
                        const features = [...((content.features as Array<{ title: string; description: string }>) || [])];
                        features[i] = { ...features[i], title: e.target.value };
                        updateContent('features', features);
                      }}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="Feature title"
                    />
                    <input
                      type="text"
                      value={feature.description}
                      onChange={(e) => {
                        const features = [...((content.features as Array<{ title: string; description: string }>) || [])];
                        features[i] = { ...features[i], description: e.target.value };
                        updateContent('features', features);
                      }}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="Description"
                    />
                    <button
                      onClick={() => {
                        const features = [...((content.features as Array<{ title: string; description: string }>) || [])];
                        features.splice(i, 1);
                        updateContent('features', features);
                      }}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const features = [...((content.features as Array<{ title: string; description: string }>) || []), { title: '', description: '' }];
                    updateContent('features', features);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Feature
                </button>
              </div>
            </div>
          </div>
        );
      case 'cta':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input
                type="text"
                value={(content.title as string) || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
                placeholder="Ready to get started?"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={(content.description as string) || ''}
                onChange={(e) => updateContent('description', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Join thousands of users..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Button Text</label>
                <input
                  type="text"
                  value={(content.button_text as string) || ''}
                  onChange={(e) => updateContent('button_text', e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Button Link</label>
                <input
                  type="text"
                  value={(content.button_link as string) || ''}
                  onChange={(e) => updateContent('button_link', e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        );
      case 'testimonials':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Section Title</label>
              <input
                type="text"
                value={(content.title as string) || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Testimonials</label>
              <div className="space-y-2 mt-1">
                {((content.testimonials as Array<{ name: string; text: string; role: string }>) || []).map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => {
                        const testimonials = [...((content.testimonials as Array<{ name: string; text: string; role: string }>) || [])];
                        testimonials[i] = { ...testimonials[i], name: e.target.value };
                        updateContent('testimonials', testimonials);
                      }}
                      className="w-24 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="Name"
                    />
                    <input
                      type="text"
                      value={t.role}
                      onChange={(e) => {
                        const testimonials = [...((content.testimonials as Array<{ name: string; text: string; role: string }>) || [])];
                        testimonials[i] = { ...testimonials[i], role: e.target.value };
                        updateContent('testimonials', testimonials);
                      }}
                      className="w-24 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="Role"
                    />
                    <input
                      type="text"
                      value={t.text}
                      onChange={(e) => {
                        const testimonials = [...((content.testimonials as Array<{ name: string; text: string; role: string }>) || [])];
                        testimonials[i] = { ...testimonials[i], text: e.target.value };
                        updateContent('testimonials', testimonials);
                      }}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="Quote"
                    />
                    <button
                      onClick={() => {
                        const testimonials = [...((content.testimonials as Array<{ name: string; text: string; role: string }>) || [])];
                        testimonials.splice(i, 1);
                        updateContent('testimonials', testimonials);
                      }}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const testimonials = [...((content.testimonials as Array<{ name: string; text: string; role: string }>) || []), { name: '', text: '', role: '' }];
                    updateContent('testimonials', testimonials);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Testimonial
                </button>
              </div>
            </div>
          </div>
        );
      case 'pricing':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Section Title</label>
              <input
                type="text"
                value={(content.title as string) || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Plans</label>
              <div className="space-y-2 mt-1">
                {((content.plans as Array<{ name: string; price: string; features: string[]; recommended: boolean }>) || []).map((plan, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => {
                        const plans = [...((content.plans as Array<{ name: string; price: string; features: string[]; recommended: boolean }>) || [])];
                        plans[i] = { ...plans[i], name: e.target.value };
                        updateContent('plans', plans);
                      }}
                      className="w-24 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="Plan name"
                    />
                    <input
                      type="text"
                      value={plan.price}
                      onChange={(e) => {
                        const plans = [...((content.plans as Array<{ name: string; price: string; features: string[]; recommended: boolean }>) || [])];
                        plans[i] = { ...plans[i], price: e.target.value };
                        updateContent('plans', plans);
                      }}
                      className="w-24 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="$19/mo"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={plan.recommended}
                        onChange={(e) => {
                          const plans = [...((content.plans as Array<{ name: string; price: string; features: string[]; recommended: boolean }>) || [])];
                          plans[i] = { ...plans[i], recommended: e.target.checked };
                          updateContent('plans', plans);
                        }}
                      />
                      Recommended
                    </label>
                    <button
                      onClick={() => {
                        const plans = [...((content.plans as Array<{ name: string; price: string; features: string[]; recommended: boolean }>) || [])];
                        plans.splice(i, 1);
                        updateContent('plans', plans);
                      }}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const plans = [...((content.plans as Array<{ name: string; price: string; features: string[]; recommended: boolean }>) || []), { name: '', price: '', features: [], recommended: false }];
                    updateContent('plans', plans);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Plan
                </button>
              </div>
            </div>
          </div>
        );
      case 'faq':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Section Title</label>
              <input
                type="text"
                value={(content.title as string) || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">FAQs</label>
              <div className="space-y-2 mt-1">
                {((content.faqs as Array<{ question: string; answer: string }>) || []).map((faq, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const faqs = [...((content.faqs as Array<{ question: string; answer: string }>) || [])];
                        faqs[i] = { ...faqs[i], question: e.target.value };
                        updateContent('faqs', faqs);
                      }}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="Question"
                    />
                    <input
                      type="text"
                      value={faq.answer}
                      onChange={(e) => {
                        const faqs = [...((content.faqs as Array<{ question: string; answer: string }>) || [])];
                        faqs[i] = { ...faqs[i], answer: e.target.value };
                        updateContent('faqs', faqs);
                      }}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm"
                      placeholder="Answer"
                    />
                    <button
                      onClick={() => {
                        const faqs = [...((content.faqs as Array<{ question: string; answer: string }>) || [])];
                        faqs.splice(i, 1);
                        updateContent('faqs', faqs);
                      }}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const faqs = [...((content.faqs as Array<{ question: string; answer: string }>) || []), { question: '', answer: '' }];
                    updateContent('faqs', faqs);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add FAQ
                </button>
              </div>
            </div>
          </div>
        );
      case 'footer':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Footer Text</label>
              <textarea
                value={(content.text as string) || ''}
                onChange={(e) => updateContent('text', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm resize-none"
                rows={2}
                placeholder="© 2026 Your Company. All rights reserved."
              />
            </div>
          </div>
        );
      case 'affiliate_disclosure':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Disclosure Text</label>
              <textarea
                value={(content.text as string) || ''}
                onChange={(e) => updateContent('text', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm resize-none"
                rows={3}
                placeholder="This site may contain affiliate links..."
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="text-sm text-muted-foreground">
            Edit content in JSON mode
          </div>
        );
    }
  };

  return (
    <div className="bg-card rounded-lg border">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
        <Icon className="w-4 h-4 text-primary" />
        <span className="flex-1 text-sm font-medium">{blockType?.label || block.type}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className="p-1 hover:bg-accent rounded disabled:opacity-30"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className="p-1 hover:bg-accent rounded disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-destructive/10 text-destructive rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      {expanded && (
        <div className="p-3 pt-0 border-t">
          {renderContentEditor()}
        </div>
      )}
    </div>
  );
}

export default function PageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id === 'new' ? null : Number(params.id);

  const [page, setPage] = useState<LandingPage | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isNew = id === null;

  const loadPage = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const page = await api.getPage(id);
      setPage(page);
      setTitle(page.title);
      setDescription(page.description);
      setBlocks(page.blocks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadVersions = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.getPageVersions(id);
      setVersions(res.data);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  }, [id]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (showVersions) {
      loadVersions();
    }
  }, [showVersions, loadVersions]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.createPage({
          title,
          slug: slugFromTitle(title),
          description,
        });
        await api.updatePage(created.id, { blocks });
        router.push(`/dashboard/pages/editor/${created.id}`);
      } else if (id) {
        const updated = await api.updatePage(id, { title, description, blocks });
        setPage(updated);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id) {
      alert('Save the page first');
      return;
    }
    setPublishing(true);
    try {
      const published = await api.publishPage(id);
      setPage(published);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (version: number) => {
    if (!id || !confirm(`Rollback to version ${version}?`)) return;
    try {
      const res = await api.rollbackPage(id, version);
      setBlocks(res.blocks || []);
      setShowVersions(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to rollback');
    }
  };

  const addBlock = (type: Block['type']) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      content: defaultContent[type] || {},
      order: blocks.length,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, updated: Block) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updated;
    setBlocks(newBlocks);
  };

  const deleteBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    newBlocks.forEach((b, i) => (b.order = i));
    setBlocks(newBlocks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/pages"
            className="p-2 hover:bg-accent rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page Title"
            className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0 w-64"
          />
          {page && (
            <span className={cn(
              'px-2 py-1 text-xs rounded-full',
              page.status === 'published' ? 'bg-green-500/10 text-green-500' :
              page.status === 'draft' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-gray-500/10 text-gray-500'
            )}>
              {page.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVersions(!showVersions)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border',
              showVersions ? 'bg-accent' : 'hover:bg-accent'
            )}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={() => setPreview(!preview)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border',
              preview ? 'bg-accent' : 'hover:bg-accent'
            )}
          >
            {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          {!isNew && (
            <button
              onClick={handlePublish}
              disabled={publishing || page?.status === 'published'}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Globe className="w-4 h-4" />
              {publishing ? 'Publishing...' : page?.status === 'published' ? 'Published' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={cn('flex-1 overflow-auto p-4', preview && 'max-w-2xl mx-auto')}>
          {preview ? (
            <div className="space-y-8">
              {blocks.map((block) => (
                <div key={block.id} className="p-8 bg-card rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-2">{block.type}</p>
                  {block.type === 'hero' && (
                    <div className="text-center">
                      <h1 className="text-4xl font-bold mb-4">{previewText(block.content.title, 'Hero Title')}</h1>
                      <p className="text-xl text-muted-foreground mb-6">{previewText(block.content.subtitle, 'Subtitle')}</p>
                      {previewText(block.content.cta_text, '') && (
                        <a
                          href={previewText(block.content.cta_link, '#')}
                          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg inline-block"
                        >
                          {previewText(block.content.cta_text, '')}
                        </a>
                      )}
                    </div>
                  )}
                  {block.type === 'features' && (
                    <div>
                      <h2 className="text-2xl font-bold text-center mb-8">{previewText(block.content.title, 'Features')}</h2>
                      <div className="grid grid-cols-3 gap-4">
                        {((block.content.features as Array<{ title: string; description: string }>) || []).map((f, i) => (
                          <div key={i} className="p-4 bg-accent rounded-lg">
                            <h3 className="font-semibold mb-2">{f.title || 'Feature'}</h3>
                            <p className="text-sm text-muted-foreground">{f.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {block.type === 'cta' && (
                    <div className="text-center p-8 bg-accent rounded-lg">
                      <h2 className="text-2xl font-bold mb-2">{previewText(block.content.title, '')}</h2>
                      <p className="text-muted-foreground mb-4">{previewText(block.content.description, '')}</p>
                      {previewText(block.content.button_text, '') && (
                        <a
                          href={previewText(block.content.button_link, '#')}
                          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg inline-block"
                        >
                          {previewText(block.content.button_text, '')}
                        </a>
                      )}
                    </div>
                  )}
                  {block.type === 'footer' && (
                    <p className="text-center text-sm text-muted-foreground">{previewText(block.content.text, '')}</p>
                  )}
                  {block.type === 'affiliate_disclosure' && (
                    <p className="text-sm text-muted-foreground bg-yellow-500/10 p-4 rounded-lg">
                      {previewText(block.content.text, '')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Page description for SEO"
                />
              </div>

              {blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={(updated) => updateBlock(index, updated)}
                  onDelete={() => deleteBlock(index)}
                  onMoveUp={() => moveBlock(index, 'up')}
                  onMoveDown={() => moveBlock(index, 'down')}
                  isFirst={index === 0}
                  isLast={index === blocks.length - 1}
                />
              ))}

              <div className="flex flex-wrap gap-2 mt-4">
                {blockTypes.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => addBlock(bt.type as Block['type'])}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-full hover:bg-accent"
                  >
                    <Plus className="w-3 h-3" />
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {showVersions && (
          <div className="w-72 border-l bg-card overflow-auto">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Version History</h3>
            </div>
            <div className="p-2">
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No versions yet</p>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">v{v.version}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRollback(v.version)}
                      className="text-xs text-primary hover:underline"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
