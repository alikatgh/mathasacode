import React, { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { FlaskConical } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { NativeSelect, NativeSelectOption } from './components/ui/native-select';
import { Label } from './components/ui/label';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { Badge } from './components/reui/badge';
import { Alert, AlertDescription } from './components/reui/alert';
import { activities } from './activities.mjs';
import { createProgressStore } from './progress.mjs';
import { createLearningModel, evaluateLearningActivity, learningText, localizeLearning } from './learning-model.mjs';

const preparations = new WeakMap();
const href = id => `#${encodeURIComponent(id)}`;
const emptyStore = {
  read: () => ({ completed: new Set(), available: true }),
  complete: () => { throw new RangeError('Unknown practice topic'); },
  isProgressKey: () => false,
};

/** Place portals before reader pagination moves the original source nodes. */
export function prepareLearning(main) {
  if (main && preparations.has(main)) return preparations.get(main);
  const doc = main?.ownerDocument;
  const language = doc?.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  if (!main || doc.body.dataset.guide !== 'true') {
    const model = createLearningModel({ language, store: emptyStore });
    if (main) preparations.set(main, model);
    return model;
  }
  const text = learningText[language];
  const headings = [...main.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')];
  const indexes = new Map(headings.map((heading, index) => [heading, index]));
  const used = new Set();
  const entries = [];
  for (const activity of activities) {
    const heading = (activity.headingIds[language] ?? activity.headingIds.en ?? [])
      .map(id => doc.getElementById(id)).find(candidate => candidate && indexes.has(candidate) && !used.has(candidate));
    if (!heading) continue;
    used.add(heading);
    const level = Number(heading.tagName.slice(1));
    const nextHeading = headings.slice(indexes.get(heading) + 1).find(candidate => Number(candidate.tagName.slice(1)) <= level);
    entries.push({ activity, heading, nextHeading });
  }
  entries.sort((left, right) => indexes.get(left.heading) - indexes.get(right.heading));
  if (!entries.length) {
    const model = createLearningModel({ language, store: emptyStore });
    preparations.set(main, model);
    return model;
  }
  for (const entry of entries) {
    const { activity, heading, nextHeading } = entry;
    const panel = doc.createElement('section');
    panel.className = 'learn-panel';
    panel.id = `practice-${activity.id}`;
    panel.dataset.activityId = activity.id;
    panel.dataset.explanationId = heading.id;
    if (nextHeading) panel.dataset.nextHeadingId = nextHeading.id;
    panel.tabIndex = -1;
    panel.setAttribute('aria-labelledby', `${panel.id}-title`);
    // Reader partitioning resolves practice explanations before React mounts.
    const readStub = doc.createElement('a');
    readStub.className = 'learn-panel__read';
    readStub.href = href(heading.id);
    readStub.hidden = true;
    panel.append(readStub);
    const source = heading.closest('.markdown-heading') ?? heading;
    if (nextHeading) (nextHeading.closest('.markdown-heading') ?? nextHeading).before(panel);
    else source.parentElement.append(panel);
    Object.assign(entry, { panel, readStub });
  }
  const overview = doc.createElement('section');
  overview.className = 'learn-overview';
  overview.id = 'learning-progress';
  overview.setAttribute('aria-label', text.overview);
  const firstHeading = main.querySelector('h1');
  if (firstHeading) (firstHeading.closest('.markdown-heading') ?? firstHeading).after(overview);
  else main.prepend(overview);
  const model = createLearningModel({
    entries, overview, language,
    store: createProgressStore(activities.map(activity => activity.id), () => doc.defaultView.localStorage),
    eventTarget: doc.defaultView,
  });
  preparations.set(main, model);
  return model;
}

function Calculator({ activity, panelId, language }) {
  const text = learningText[language];
  const [inputs, setInputs] = useState(() => ({
    values: Object.fromEntries(activity.fields.map(field => [field.key, String(field.value)])), badInputs: new Set(),
  }));
  const calculated = useMemo(() => evaluateLearningActivity(activity, inputs.values, language, inputs), [activity, inputs, language]);
  const errorId = `${panelId}-input-error`;
  const resultLabel = `${panelId}-result-label`;
  const update = (field, event) => {
    const { value, validity } = event.currentTarget;
    setInputs(previous => {
      const badInputs = new Set(previous.badInputs);
      if (validity?.badInput) badInputs.add(field.key);
      else badInputs.delete(field.key);
      return { values: { ...previous.values, [field.key]: value }, badInputs };
    });
  };
  return <form className="learn-calculator flex flex-col gap-5" noValidate onSubmit={event => event.preventDefault()}>
    <div className="learn-fields grid gap-4 sm:grid-cols-2">
      {activity.fields.map((field, index) => {
        const id = `${panelId}-field-${index}`;
        const active = calculated.activeKeys.has(field.key);
        const invalid = Boolean(calculated.error && (!calculated.invalidKey || calculated.invalidKey === field.key));
        const control = {
          id, name: field.key, value: inputs.values[field.key], required: active, disabled: !active,
          'aria-invalid': invalid || undefined, 'aria-describedby': invalid ? errorId : undefined,
          className: 'learn-field__control', onChange: event => update(field, event),
        };
        return <div key={field.key} className="learn-field flex flex-col gap-2" hidden={!active}>
          <Label className="learn-field__label" htmlFor={id}>{localizeLearning(field.label, language)}</Label>
          {field.type === 'select' ? <NativeSelect {...control} className={`${control.className} w-full`}>
            {(field.options ?? []).map(option => <NativeSelectOption key={option.value} value={option.value}>{localizeLearning(option.label, language)}</NativeSelectOption>)}
          </NativeSelect> : <Input {...control} type={field.type === 'number' ? 'number' : 'text'}
            step={field.type === 'number' ? field.step ?? 'any' : undefined}
            min={field.min} max={field.max} maxLength={field.type === 'number' ? undefined : 4000}
            spellCheck={false} autoComplete="off" />}
        </div>;
      })}
    </div>
    {calculated.error && <Alert id={errorId} variant="destructive" role="alert" className="learn-error">
      <AlertDescription>{calculated.error}</AlertDescription>
    </Alert>}
    {!calculated.error && calculated.expression && <p className="learn-expression"><code>{calculated.expression}</code></p>}
    <Card className="learn-result-card bg-muted/40 shadow-none">
      <CardContent className="flex flex-col gap-2 py-4">
        <Label asChild><span className="learn-result-label" id={resultLabel}>{text.result}</span></Label>
        <output className="learn-result break-words font-mono text-lg" aria-live="polite" aria-atomic="true" aria-labelledby={resultLabel}
          htmlFor={activity.fields.map((_, index) => `${panelId}-field-${index}`).join(' ')}>
          {calculated.error ? text.unavailable : calculated.result}
        </output>
        {!calculated.error && calculated.explanation && <p className="learn-calculation-note text-sm text-muted-foreground">{calculated.explanation}</p>}
      </CardContent>
    </Card>
  </form>;
}

function Quiz({ entry, model }) {
  const { activity, panel } = entry;
  const { language } = model;
  const text = learningText[language];
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const firstOption = useRef(null);
  const feedbackId = `${panel.id}-quiz-feedback`;
  const promptId = `${panel.id}-quiz-prompt`;
  const check = event => {
    event.preventDefault();
    if (!answer) {
      setFeedback({ state: 'missing', message: text.choose });
      firstOption.current?.focus({ preventScroll: true });
      return;
    }
    const correct = answer === activity.quiz.answer;
    setFeedback({ state: correct ? 'correct' : 'incorrect', message: `${correct ? text.correct : text.incorrect} ${localizeLearning(activity.quiz.explanation, language)}` });
    if (correct) model.complete(activity.id);
  };
  return <Accordion type="single" collapsible className="learn-quiz">
    <AccordionItem value="quiz">
      <AccordionTrigger className="learn-quiz__summary">{text.quiz}</AccordionTrigger>
      <AccordionContent className="h-auto">
        <form noValidate className="learn-quiz__form flex flex-col gap-4" onSubmit={check}>
          <p id={promptId} className="learn-quiz__prompt font-medium">{localizeLearning(activity.quiz.prompt, language)}</p>
          <RadioGroup className="learn-quiz__choices gap-3" name={`${panel.id}-answer`} value={answer} required
            aria-labelledby={promptId} aria-describedby={feedback ? feedbackId : undefined}
            aria-invalid={feedback?.state === 'missing' || feedback?.state === 'incorrect' || undefined}
            onValueChange={value => { setAnswer(value); setFeedback(null); }}>
            {activity.quiz.options.map((option, index) => {
              const id = `${panel.id}-answer-${option.id}`;
              return <div key={option.id} className="learn-choice flex items-start gap-3">
                <RadioGroupItem className="learn-choice__input mt-0.5" id={id} value={option.id} ref={index === 0 ? firstOption : undefined} />
                <Label className="learn-choice__text cursor-pointer leading-normal" htmlFor={id}>{localizeLearning(option.text, language)}</Label>
              </div>;
            })}
          </RadioGroup>
          <Button type="submit" className="learn-quiz__check self-start">{text.check}</Button>
          {feedback && <Alert id={feedbackId} role="status" aria-live="polite" aria-atomic="true"
            variant={feedback.state === 'correct' ? 'default' : 'destructive'} className="learn-quiz__feedback" data-state={feedback.state}>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>}
        </form>
      </AccordionContent>
    </AccordionItem>
  </Accordion>;
}

function Practice({ entry, model, completed }) {
  const { activity, panel, heading, nextHeading } = entry;
  const text = learningText[model.language];
  return <Card className="learn-panel-card">
    <CardHeader className="learn-panel__header">
      <Badge variant="outline" className="learn-panel__marker"><FlaskConical aria-hidden="true" />{model.language === 'zh' ? '动手练习' : 'Practice lab'}</Badge>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle id={`${panel.id}-title`} className="learn-panel__title" role="heading" aria-level={Math.min(6, Number(heading.tagName.slice(1)) + 1)}>{text.practice(localizeLearning(activity.title, model.language))}</CardTitle>
        {completed && <Badge variant="outline" className="learn-panel__status">{text.complete}</Badge>}
      </div>
      <CardDescription className="learn-panel__description">{localizeLearning(activity.description, model.language)}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-6">
      <Calculator activity={activity} panelId={panel.id} language={model.language} />
      <Quiz entry={entry} model={model} />
    </CardContent>
    <CardFooter className="learn-panel__footer flex flex-wrap justify-between gap-3">
      <Button variant="outline" asChild><a className="learn-panel__read" href={href(heading.id)}>{text.read}</a></Button>
      {nextHeading && <Button variant="ghost" asChild><a className="learn-panel__skip" href={href(nextHeading.id)}>{text.skip}</a></Button>}
    </CardFooter>
  </Card>;
}

function Overview({ model, snapshot }) {
  const text = learningText[model.language];
  const { done, total, available, completed } = snapshot;
  const next = model.entries.find(entry => !completed.has(entry.activity.id)) ?? model.entries[0];
  return <Card className="learn-overview-card">
    <CardHeader>
      <CardTitle className="learn-overview__title">{text.overview}</CardTitle>
      <CardDescription className="learn-overview__description">{text.introduction}</CardDescription>
    </CardHeader>
    <CardContent className="learn-overview__progress flex flex-col gap-3">
      <span className="learn-overview__count text-sm" id="learning-progress-count" aria-live="polite" aria-atomic="true">{text.progress(done, total)}</span>
      <Progress className="learn-overview__bar" value={total ? done / total * 100 : 0} aria-labelledby="learning-progress-count" />
    </CardContent>
    <CardFooter className="learn-overview__footer flex flex-wrap items-center gap-4">
      {next && <Button asChild><a className="learn-overview__next" href={href(next.panel.id)}>{done === total ? text.review : done ? text.next : text.start}</a></Button>}
      <p className="learn-overview__storage text-sm text-muted-foreground" role="status">{available ? text.saved : text.unsaved}</p>
    </CardFooter>
  </Card>;
}

/** Render every portal on every route so hidden practices retain React state. */
export function LearningPortals({ model }) {
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useLayoutEffect(() => { for (const entry of model.entries) entry.readStub?.remove(); }, [model]);
  return <>
    {model.overview && createPortal(<Overview model={model} snapshot={snapshot} />, model.overview, 'learning-overview')}
    {model.entries.map(entry => createPortal(<Practice entry={entry} model={model} completed={snapshot.completed.has(entry.activity.id)} />, entry.panel, entry.activity.id))}
  </>;
}
