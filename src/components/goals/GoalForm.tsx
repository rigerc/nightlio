import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Info } from 'lucide-react';

interface GoalFormData {
  title: string;
  description: string;
  frequency: string;
}

export interface GoalFormRef {
  prefill: (title: string, description: string) => void;
}

interface GoalFormProps {
  onSubmit: (data: GoalFormData) => Promise<void>;
  onCancel: () => void;
  showInlineSuggestions?: boolean;
}

type FormErrors = Partial<Record<'title' | 'description', string>>;

const GoalForm = forwardRef<GoalFormRef, GoalFormProps>(({ onSubmit, onCancel, showInlineSuggestions = true }, ref) => {
  const [formData, setFormData] = useState({ title: '', description: '', frequencyNumber: 3 });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const titleMax = 80;
  const descMax = 280;
  const titleLen = formData.title.length;
  const descLen = formData.description.length;
  const freqLabel = useMemo(() => `${formData.frequencyNumber} ${formData.frequencyNumber === 1 ? 'day' : 'days'} a week`, [formData.frequencyNumber]);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: formData.title.trim(), description: formData.description.trim(), frequency: freqLabel });
    } finally {
      setSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    prefill: (title: string, description: string) => {
      setFormData(prev => ({ ...prev, title, description }));
    },
  }));

  const btnBase: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: '8px 12px', borderRadius: '8px', fontSize: '0.95rem' };

  return (
    <div style={{ maxWidth: '600px' }}>
      <button
        onClick={onCancel}
        style={btnBase}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bg-softer)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
      >
        <ArrowLeft size={16} /> Back to Goals
      </button>

      <form onSubmit={(e) => void handleSubmit(e)}>
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="goal-title" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text)', fontSize: '0.95rem' }}>
            Goal Title *
          </label>
          <input
            type="text"
            id="goal-title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Morning Meditation, Evening Walk, Read Before Bed"
            style={{ width: '100%', padding: '12px 16px', border: `1px solid ${errors.title ? 'var(--error)' : 'var(--border)'}`, borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
            autoFocus
            maxLength={titleMax}
            onFocus={(e) => { if (!errors.title) e.target.style.borderColor = 'var(--accent-600)'; }}
            onBlur={(e) => { if (!errors.title) e.target.style.borderColor = 'var(--border)'; }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {errors.title
              ? <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{errors.title}</div>
              : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Make it clear and specific</span>}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{titleLen}/{titleMax}</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="goal-desc" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text)', fontSize: '0.95rem' }}>
            Description *
          </label>
          <textarea
            id="goal-desc"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe your goal and why it's important to you..."
            rows={4}
            style={{ width: '100%', padding: '12px 16px', border: `1px solid ${errors.description ? 'var(--error)' : 'var(--border)'}`, borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: '100px', transition: 'border-color 0.2s' }}
            maxLength={descMax}
            onFocus={(e) => { if (!errors.description) e.target.style.borderColor = 'var(--accent-600)'; }}
            onBlur={(e) => { if (!errors.description) e.target.style.borderColor = 'var(--border)'; }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {errors.description
              ? <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{errors.description}</div>
              : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Add a short motivation to keep you accountable</span>}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{descLen}/{descMax}</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.95rem' }}>Frequency</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Calendar size={14} /><span>{freqLabel}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {Array.from({ length: 7 }, (_, i) => i + 1).map(n => {
              const active = formData.frequencyNumber === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleInputChange('frequencyNumber', n)}
                  aria-pressed={active}
                  style={{ padding: '10px 0', borderRadius: 8, border: `1px solid ${active ? 'color-mix(in oklab, var(--accent-600), transparent 30%)' : 'var(--border)'}`, background: active ? 'var(--accent-600)' : 'var(--surface)', color: active ? 'white' : 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Info size={14} /><span>This sets your weekly target. You can mark progress daily.</span>
          </div>
        </div>

        {showInlineSuggestions && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Quick suggestions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[{ t: 'Morning Meditation', d: '10 minutes of mindfulness' }, { t: 'Evening Walk', d: '30-minute walk outside' }, { t: 'Read Before Bed', d: 'Read 20 minutes' }].map((s) => (
                <button
                  key={s.t}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, title: s.t, description: s.d }))}
                  style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {s.t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, padding: '12px 24px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bg-softer)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            style={{ flex: 1, padding: '12px 24px', fontSize: '1rem', opacity: submitting ? 0.8 : 1, cursor: submitting ? 'default' : 'pointer' }}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
});

GoalForm.displayName = 'GoalForm';

export default GoalForm;
