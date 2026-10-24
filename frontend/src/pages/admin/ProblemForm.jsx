import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NavLink, useNavigate, useParams } from 'react-router';
import { AlertCircle, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../../api/client';
import { refreshProblems } from '../../hooks/useProblems';
import { DIFFICULTIES, TAGS, difficultyMeta } from '../../lib/constants';
import { ErrorState, PageSpinner } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

const CODE_LANGS = ['C++', 'Java', 'JavaScript'];
const required = (label) => z.string().trim().min(1, `${label} is required`);

const problemSchema = z.object({
  title: required('Title'),
  description: required('Description'),
  difficulty: z.enum(DIFFICULTIES),
  tags: z.enum(TAGS.map((t) => t.value)),
  visibleTestCases: z
    .array(z.object({ input: required('Input'), output: required('Output'), explanation: required('Explanation') }))
    .min(1, 'Add at least one visible test case'),
  hiddenTestCases: z
    .array(z.object({ input: z.string(), output: required('Output') }))
    .min(1, 'Add at least one hidden test case'),
  startCode: z.array(z.object({ language: z.enum(CODE_LANGS), initialCode: required('Starter code') })).length(3),
  referenceSolution: z.array(z.object({ language: z.enum(CODE_LANGS), completeCode: required('Solution') })).length(3),
});

const EMPTY = {
  title: '',
  description: '',
  difficulty: 'easy',
  tags: 'array',
  visibleTestCases: [{ input: '', output: '', explanation: '' }],
  hiddenTestCases: [{ input: '', output: '' }],
  startCode: CODE_LANGS.map((language) => ({ language, initialCode: '' })),
  referenceSolution: CODE_LANGS.map((language) => ({ language, completeCode: '' })),
};

// Normalise an API problem into form values (fixed language order, no sub-document ids).
const toFormValues = (p) => ({
  title: p.title,
  description: p.description,
  difficulty: p.difficulty,
  tags: p.tags,
  visibleTestCases: (p.visibleTestCases || []).map(({ input, output, explanation }) => ({ input, output, explanation: explanation || '' })),
  hiddenTestCases: (p.hiddenTestCases || []).map(({ input, output }) => ({ input, output })),
  startCode: CODE_LANGS.map((language) => ({
    language,
    initialCode: p.startCode?.find((s) => s.language === language)?.initialCode || '',
  })),
  referenceSolution: CODE_LANGS.map((language) => ({
    language,
    completeCode: p.referenceSolution?.find((s) => s.language === language)?.completeCode || '',
  })),
});

const Err = ({ e }) => (e?.message ? <p className="mt-1 text-xs text-error">{e.message}</p> : null);

function Section({ title, description, children, action }) {
  return (
    <section className="card border border-base-300 bg-base-100">
      <div className="card-body gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="card-title text-lg">{title}</h2>
            {description && <p className="text-sm text-base-content/60">{description}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function ProblemForm() {
  const { problemId } = useParams();
  const isEdit = !!problemId;
  const navigate = useNavigate();
  const toast = useToast();
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(!isEdit);
  const [serverError, setServerError] = useState('');
  const [codeTab, setCodeTab] = useState(0);
  const [preview, setPreview] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(problemSchema), defaultValues: EMPTY });

  const visible = useFieldArray({ control, name: 'visibleTestCases' });
  const hidden = useFieldArray({ control, name: 'hiddenTestCases' });

  useEffect(() => {
    if (!isEdit) return;
    axiosClient
      .get(`/problem/problemById/${problemId}`)
      .then(({ data }) => {
        reset(toFormValues(data));
        setLoaded(true);
      })
      .catch((e) => setLoadError(getErrorMessage(e, 'Could not load problem')));
  }, [isEdit, problemId, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) {
        await axiosClient.put(`/problem/update/${problemId}`, data);
        toast.success('Problem updated');
      } else {
        await axiosClient.post('/problem/create', data);
        toast.success('Problem created');
      }
      await refreshProblems();
      navigate('/admin/problems');
    } catch (e) {
      const msg = getErrorMessage(e, 'Save failed');
      setServerError(msg);
      toast.error(msg);
    }
  };

  if (loadError) return <ErrorState message={loadError} />;
  if (!loaded) return <PageSpinner label="Loading problem…" />;

  const codeErrors = [0, 1, 2].some((i) => errors.startCode?.[i] || errors.referenceSolution?.[i]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl space-y-6" noValidate>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <NavLink to="/admin/problems" className="link link-hover text-sm text-base-content/60">
            ← Manage problems
          </NavLink>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit problem' : 'Create problem'}</h1>
          <p className="text-sm text-base-content/60">
            Reference solutions are executed on Judge0 against the visible test cases before saving.
          </p>
        </div>
      </div>

      {serverError && (
        <div role="alert" className="alert alert-error alert-soft">
          <AlertCircle size={18} /> <span className="break-words">{serverError}</span>
        </div>
      )}

      <Section title="Basics">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            Title
          </label>
          <input id="title" className={`input w-full ${errors.title ? 'input-error' : ''}`} {...register('title')} />
          <Err e={errors.title} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPreview((p) => !p)}>
              {preview ? <EyeOff size={12} /> : <Eye size={12} />} {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div className="min-h-40 rounded-field border border-base-300 bg-base-200 p-3 text-sm whitespace-pre-wrap">
              {watch('description') || <span className="text-base-content/40">Nothing to preview</span>}
            </div>
          ) : (
            <textarea
              id="description"
              rows={8}
              className={`textarea w-full ${errors.description ? 'textarea-error' : ''}`}
              placeholder={'Problem statement, constraints, input format and output format…'}
              {...register('description')}
            />
          )}
          <Err e={errors.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="difficulty" className="mb-1 block text-sm font-medium">
              Difficulty
            </label>
            <select id="difficulty" className="select w-full" {...register('difficulty')}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {difficultyMeta(d).label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tags" className="mb-1 block text-sm font-medium">
              Topic
            </label>
            <select id="tags" className="select w-full" {...register('tags')}>
              {TAGS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section
        title="Visible test cases"
        description="Shown to users as examples and used by Run."
        action={
          <button type="button" className="btn btn-sm btn-outline" onClick={() => visible.append({ input: '', output: '', explanation: '' })}>
            <Plus size={14} /> Add
          </button>
        }
      >
        <Err e={errors.visibleTestCases?.root || errors.visibleTestCases} />
        {visible.fields.map((f, i) => (
          <div key={f.id} className="rounded-box border border-base-300 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Example {i + 1}</span>
              <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => visible.remove(i)} aria-label={`Remove example ${i + 1}`}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <textarea rows={3} className="textarea w-full font-mono text-xs" placeholder="stdin" aria-label="Input" {...register(`visibleTestCases.${i}.input`)} />
                <Err e={errors.visibleTestCases?.[i]?.input} />
              </div>
              <div>
                <textarea rows={3} className="textarea w-full font-mono text-xs" placeholder="expected stdout" aria-label="Output" {...register(`visibleTestCases.${i}.output`)} />
                <Err e={errors.visibleTestCases?.[i]?.output} />
              </div>
            </div>
            <textarea rows={2} className="textarea mt-3 w-full text-sm" placeholder="Explanation" aria-label="Explanation" {...register(`visibleTestCases.${i}.explanation`)} />
            <Err e={errors.visibleTestCases?.[i]?.explanation} />
          </div>
        ))}
      </Section>

      <Section
        title="Hidden test cases"
        description="Used only for Submit. Users never see these."
        action={
          <button type="button" className="btn btn-sm btn-outline" onClick={() => hidden.append({ input: '', output: '' })}>
            <Plus size={14} /> Add
          </button>
        }
      >
        <Err e={errors.hiddenTestCases?.root || errors.hiddenTestCases} />
        {hidden.fields.map((f, i) => (
          <div key={f.id} className="flex gap-3 rounded-box border border-base-300 p-3">
            <span className="pt-2 text-xs text-base-content/50 tabular-nums">#{i + 1}</span>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div>
                <textarea rows={2} className="textarea w-full font-mono text-xs" placeholder="stdin" aria-label={`Hidden ${i + 1} input`} {...register(`hiddenTestCases.${i}.input`)} />
                <Err e={errors.hiddenTestCases?.[i]?.input} />
              </div>
              <div>
                <textarea rows={2} className="textarea w-full font-mono text-xs" placeholder="expected stdout" aria-label={`Hidden ${i + 1} output`} {...register(`hiddenTestCases.${i}.output`)} />
                <Err e={errors.hiddenTestCases?.[i]?.output} />
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-xs self-start text-error" onClick={() => hidden.remove(i)} aria-label={`Remove hidden case ${i + 1}`}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </Section>

      <Section title="Code" description="Starter templates shown in the editor, and the reference solutions used for verification.">
        {codeErrors && <p className="text-xs text-error">Every language needs starter code and a reference solution.</p>}
        <div role="tablist" className="tabs tabs-box tabs-sm w-fit">
          {CODE_LANGS.map((l, i) => (
            <button
              type="button"
              key={l}
              role="tab"
              aria-selected={codeTab === i}
              className={`tab gap-1 ${codeTab === i ? 'tab-active' : ''}`}
              onClick={() => setCodeTab(i)}
            >
              {l}
              {(errors.startCode?.[i] || errors.referenceSolution?.[i]) && <span className="h-1.5 w-1.5 rounded-full bg-error" />}
            </button>
          ))}
        </div>
        {CODE_LANGS.map((l, i) => (
          <div key={l} className={`grid gap-4 lg:grid-cols-2 ${codeTab === i ? '' : 'hidden'}`}>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor={`start-${i}`}>
                Starter code
              </label>
              <textarea
                id={`start-${i}`}
                rows={14}
                spellCheck={false}
                className="textarea w-full font-mono text-xs leading-relaxed"
                {...register(`startCode.${i}.initialCode`)}
              />
              <Err e={errors.startCode?.[i]?.initialCode} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor={`ref-${i}`}>
                Reference solution
              </label>
              <textarea
                id={`ref-${i}`}
                rows={14}
                spellCheck={false}
                className="textarea w-full font-mono text-xs leading-relaxed"
                {...register(`referenceSolution.${i}.completeCode`)}
              />
              <Err e={errors.referenceSolution?.[i]?.completeCode} />
            </div>
          </div>
        ))}
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end gap-2 rounded-box border border-base-300 bg-base-100/90 p-3 shadow-lg backdrop-blur">
        <NavLink to="/admin/problems" className="btn btn-ghost">
          Cancel
        </NavLink>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || (isEdit && !isDirty)}>
          {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : <Save size={16} />}
          {isSubmitting ? 'Verifying on Judge0…' : isEdit ? 'Save changes' : 'Create problem'}
        </button>
      </div>
    </form>
  );
}

export default ProblemForm;
