import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Code2, Download, ExternalLink, File, FileText, Folder, FolderOpen, Home, List, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from 'lucide-react';
import { Button } from '../../site/components/ui/button';
import { Input } from '../../site/components/ui/input';
import { Progress } from '../../site/components/ui/progress';
import { ScrollArea } from '../../site/components/ui/scroll-area';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../../site/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../site/components/ui/sheet';
import { contentURL, routeURL, renderContent, hydrateContent } from './content.mjs';
import './app.css';
import { normalizeQuiz, answerIsCorrect } from './quiz.mjs';
import { Explainer } from './explainers.jsx';

const STORAGE = 'aiingeering:progress:v1';
const THEME = 'math-as-code-theme-v1';
const readStorage = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback; } catch { return fallback; } };
const saveStorage = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
const basename = path => path.split('/').filter(Boolean).pop() || 'All files';
const dirname = path => path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
const humanSize = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const categoryName = kind => ({ phases: 'Curriculum', certifications: 'Certifications', manuals: 'Manuals', cheatsheets: 'Cheatsheets', i18n: 'Translations', course: 'About the course', phase: 'Curriculum', lesson: 'Curriculum', certification: 'Certifications', 'certification-lesson': 'Certifications', manual: 'Manuals', cheatsheet: 'Cheatsheets', resource: 'Resources', documentation: 'Project documentation', docs: 'Project documentation' }[kind] || (kind ? kind.charAt(0).toUpperCase() + kind.slice(1).replaceAll('-', ' ') : 'Resources'));
const safeDownloadURL = path => { try { return contentURL(path); } catch { return undefined; } };
const readRoute = () => { const params = new URLSearchParams(location.search); return { path: params.get('path') || '', folder: params.has('folder') ? params.get('folder') : null, hash: location.hash }; };
const folderURL = folder => `${location.pathname}?folder=${encodeURIComponent(folder)}`;
const homeURL = () => location.pathname;
const binaryPattern = /\.(?:png|jpe?g|webp|gif|avif|ico|pdf|woff2?|ttf|otf|zip|gz|zst|bin|pt|pth|safetensors|h5|mp[34]|wav|ogg|mov|webm|o|pyc|class|exe|dll|so|dylib|wasm)$/i;
const imagePattern = /\.(?:png|jpe?g|webp|gif|avif|svg|ico)$/i;


function IconButton({ label, children, ...props }) {
  return <Button type="button" variant="ghost" size="icon-sm" aria-label={label} title={label} {...props}>{children}</Button>;
}

function RouteLink({ path, folder, navigate, children, onClick, ...props }) {
  const url = folder !== undefined ? folderURL(folder) : path ? routeURL(path) : homeURL();
  return <a href={url} {...props} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(url);
  }}>{children}</a>;
}

function CurriculumSidebar({ catalog, route, navigate, completed, theme, setTheme, close, searchRef }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(() => new Set());
  const activeGroup = catalog.groups.find(group => group.entries.some(entry => entry.path === route.path));
  const kinds = [...new Set(catalog.groups.map(group => group.kind))];
  const needle = query.trim().toLocaleLowerCase();
  const searchText = useMemo(() => new Map(catalog.entries.map(entry => [entry.path, entry.search || ''])), [catalog]);
  const groups = useMemo(() => catalog.groups.filter(group => category === 'all' || group.kind === category).map(group => ({ ...group, entries: group.entries.filter(entry => !needle || `${entry.title} ${entry.path} ${group.title} ${searchText.get(entry.path) || ''}`.toLocaleLowerCase().includes(needle)) })).filter(group => group.entries.length), [catalog, category, needle]);
  const found = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const lessonEntries = catalog.entries.filter(entry => entry.kind === 'lesson' || entry.kind === 'certification');
  const completedCount = lessonEntries.filter(entry => completed[entry.path]?.completed).length;
  useEffect(() => { if (activeGroup) setExpanded(previous => new Set([...previous, activeGroup.id])); }, [activeGroup?.id]);
  const follow = url => { navigate(url); close?.(); };
  return <Sidebar collapsible="none" className="topic-sidebar engineering-sidebar" aria-label="Curriculum navigation">
    <SidebarHeader className="sidebar-header">
      <div className="sidebar-brand-row"><a className="sidebar-brand" href="https://mathasacode.aulenor.com/">Math as Code</a>{close && <IconButton label="Close navigation" onClick={close}><X /></IconButton>}</div>
      <nav className="sidebar-sections engineering-sections" aria-label="Learning sections"><a href="https://mathasacode.aulenor.com/"><BookOpen /><span>Math</span></a><a href="https://mathasacode.aulenor.com/machine-learning.html"><Code2 /><span>ML</span></a><RouteLink navigate={follow} aria-current="page"><BookOpen /><span>AI engineering</span></RouteLink></nav>
      <div className="sidebar-search engineering-search"><Search aria-hidden="true" /><Input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a lesson or resource…" aria-label="Search curriculum" />{query && <IconButton label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X /></IconButton>}</div>
      <label className="engineering-category-label"><span className="sr-only">Content category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All content</option>{kinds.map(kind => <option key={kind} value={kind}>{categoryName(kind)}</option>)}</select></label>
    </SidebarHeader>
    <div className="engineering-sidebar-shortcuts"><RouteLink navigate={follow} aria-current={!route.path && route.folder === null ? 'page' : undefined}><Home />Overview</RouteLink><RouteLink folder="" navigate={follow} aria-current={route.folder !== null ? 'page' : undefined}><Folder />All source files</RouteLink></div>
    <SidebarContent className="engineering-sidebar-content">
      <div className="sidebar-contents-label"><span>{needle ? 'Search results' : 'Contents'}</span><span aria-live="polite">{found}</span><button type="button" onClick={() => setExpanded(expanded.size ? new Set() : new Set(groups.map(group => group.id)))}>{expanded.size ? 'Collapse all' : 'Expand all'}</button></div>
      <ScrollArea className="engineering-sidebar-scroll"><nav aria-label="Curriculum groups" className="engineering-group-list">{groups.map(group => {
        const open = !!needle || expanded.has(group.id);
        const listId = `engineering-group-${close ? 'mobile' : 'desktop'}-${group.id}`;
        return <SidebarGroup className="topic-group" key={group.id}><button type="button" className="topic-group-toggle" aria-expanded={open} aria-controls={listId} onClick={() => setExpanded(previous => { const next = new Set(previous); next.has(group.id) ? next.delete(group.id) : next.add(group.id); return next; })}><ChevronDown aria-hidden="true" /><span>{group.title}</span><span className="topic-group-count">{group.entries.length}</span></button><SidebarMenu id={listId} hidden={!open}>{group.entries.map((entry, index) => <SidebarMenuItem key={entry.path}><SidebarMenuButton asChild isActive={route.path === entry.path} className="topic-link engineering-topic-link"><RouteLink path={entry.path} navigate={follow} aria-current={route.path === entry.path ? 'page' : undefined}><span className="topic-index">{String(index + 1).padStart(2, '0')}</span><span className="topic-label">{entry.title}</span>{completed[entry.path]?.completed && <Check className="engineering-complete-icon" aria-label="Completed" />}</RouteLink></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup>;
      })}{!found && <div className="sidebar-empty" role="status"><p>No lessons match “{query}”.</p><Button variant="link" size="sm" onClick={() => { setQuery(''); setCategory('all'); }}>Clear filters</Button></div>}</nav></ScrollArea>
    </SidebarContent>
    <SidebarFooter className="sidebar-utilities engineering-sidebar-footer">{lessonEntries.length > 0 && <div className="sidebar-progress"><div className="sidebar-progress-heading"><span>Your progress</span><span className="sidebar-progress-count">{completedCount}/{lessonEntries.length}</span></div><Progress value={completedCount / lessonEntries.length * 100} aria-label={`${completedCount} of ${lessonEntries.length} lessons complete`} className="engineering-progress" /></div>}<div className="engineering-sidebar-bottom"><a href={catalog.source?.url} target="_blank" rel="noreferrer">Course source <ExternalLink /></a><IconButton label={theme === 'dark' ? 'Use light appearance' : 'Use dark appearance'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</IconButton></div></SidebarFooter>
  </Sidebar>;
}

function Overview({ catalog, navigate }) {
  const categories = [...new Set(catalog.groups.map(group => group.kind))];
  const firstLesson = catalog.entries.find(entry => entry.kind === 'lesson') || catalog.entries[0];
  return <div className="engineering-overview">
    <div className="engineering-eyebrow">AI engineering from scratch</div>
    <h1>Understand it.<br />Build it. Use it.</h1>
    <p className="engineering-intro">A complete working curriculum, from the math behind a model to the systems around it. Read the lessons, inspect every implementation, and check your understanding as you go.</p>
    <div className="engineering-home-actions">{firstLesson && <Button asChild><RouteLink path={firstLesson.path} navigate={navigate}>Start the curriculum <ArrowRight /></RouteLink></Button>}<Button asChild variant="outline"><RouteLink folder="" navigate={navigate}><Folder />Browse source files</RouteLink></Button></div>
    <dl className="engineering-counts"><div><dt>Phase lessons</dt><dd>{catalog.counts.phaseLessons ?? 0}</dd></div><div><dt>Certification lessons</dt><dd>{catalog.counts.certificationLessons ?? 0}</dd></div><div><dt>Source files</dt><dd>{catalog.counts.files ?? catalog.files.length}</dd></div></dl>
    <section className="engineering-directory" aria-labelledby="engineering-directory-title"><h2 id="engineering-directory-title">The complete library</h2><p>Choose a section. Every lesson includes its original text and available code, tests, quizzes, and shipped artifacts.</p>{categories.map(kind => <div key={kind} className="engineering-directory-category"><h3>{categoryName(kind)}</h3><div>{catalog.groups.filter(group => group.kind === kind).map(group => <details className="engineering-directory-group" key={group.id}><summary><span>{group.title}</span><span>{group.entries.length}</span><ChevronDown /></summary><ol>{group.entries.map(entry => <li key={entry.path}><RouteLink path={entry.path} navigate={navigate}>{entry.title}<ArrowRight /></RouteLink></li>)}</ol></details>)}</div></div>)}</section>
  </div>;
}

function FileBrowser({ catalog, folder, navigate }) {
  const [query, setQuery] = useState('');
  const prefix = folder ? `${folder.replace(/\/$/, '')}/` : '';
  const files = catalog.files.filter(file => file.path.startsWith(prefix));
  const folders = [...new Set(files.map(file => file.path.slice(prefix.length)).filter(path => path.includes('/')).map(path => path.split('/')[0]))].sort();
  const immediate = files.filter(file => !file.path.slice(prefix.length).includes('/'));
  const needle = query.trim().toLocaleLowerCase();
  const shownFiles = needle ? files.filter(file => file.path.toLocaleLowerCase().includes(needle)) : immediate;
  return <div className="engineering-files-page"><div className="engineering-eyebrow">Complete source snapshot</div><h1>{folder ? basename(folder) : 'All source files'}</h1><nav className="engineering-breadcrumbs" aria-label="Folder path"><RouteLink folder="" navigate={navigate}>Source</RouteLink>{folder?.split('/').map((part, index, parts) => <React.Fragment key={index}><ChevronRight /><RouteLink folder={parts.slice(0, index + 1).join('/')} navigate={navigate}>{part}</RouteLink></React.Fragment>)}</nav><p className="engineering-muted">{files.length.toLocaleString()} files in this folder and its subfolders. Open a file to read it or download the original.</p><div className="engineering-file-search"><Search /><Input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find files within this folder…" aria-label="Search source files" /></div><div className="engineering-file-table">{folder && !needle && <RouteLink folder={dirname(folder)} navigate={navigate} className="engineering-file-row"><Folder /><span>..</span><span>Parent folder</span><ChevronRight /></RouteLink>}{!needle && folders.map(name => <RouteLink key={name} folder={`${prefix}${name}`} navigate={navigate} className="engineering-file-row"><Folder /><span>{name}</span><span>Folder</span><ChevronRight /></RouteLink>)}{shownFiles.map(file => <RouteLink key={file.path} path={file.path} navigate={navigate} className="engineering-file-row"><FileText /><span>{needle ? file.path.slice(prefix.length) : basename(file.path)}</span><span>{humanSize(file.bytes || 0)}</span><ChevronRight /></RouteLink>)}{!shownFiles.length && (needle || !folders.length) && <p className="engineering-empty" role="status">{needle ? `No files match “${query}”.` : 'This folder is empty.'}</p>}</div></div>;
}

function Quiz({ data, path, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const resultRef = useRef(null);
  const questions = data.questions || [];
  const correctIndices = question => Array.isArray(question.correct) ? question.correct : [question.correct];
  const isCorrect = (question, index) => answerIsCorrect(question, answers[index]);
  const score = questions.filter(isCorrect).length;
  const answered = questions.filter((_, index) => answers[index]?.length).length;
  const valid = questions.length > 0 && questions.every(question => Array.isArray(question.options) && correctIndices(question).every(index => Number.isInteger(index) && index >= 0 && index < question.options.length));
  if (!valid) return <p className="engineering-error" role="alert">This assessment has an unsupported question format. Download the original JSON to inspect it.</p>;
  return <section className="engineering-quiz" aria-labelledby="engineering-quiz-heading"><div className="engineering-quiz-heading"><div><div className="engineering-eyebrow">Check your understanding</div><h2 id="engineering-quiz-heading">{data.title || 'Lesson quiz'}</h2></div><span>{questions.length} questions{data.timeLimitMinutes ? ` · ${data.timeLimitMinutes} min suggested` : ''}</span></div><p className="engineering-muted">Choose your answers, then submit to see your score and explanations.{questions.some(question => question.type === 'multiple') ? ' Some questions have more than one correct answer.' : ''}</p><form onSubmit={event => { event.preventDefault(); setSubmitted(true); onComplete?.({ score, total: questions.length, completed: score === questions.length }); requestAnimationFrame(() => resultRef.current?.focus()); }}>
    {questions.map((question, index) => { const multiple = question.type === 'multiple' || correctIndices(question).length > 1; return <fieldset className="engineering-question" key={question.id || index} disabled={submitted}><legend><span className="engineering-question-number">{index + 1}.</span> {question.question || question.prompt}{multiple && <span className="engineering-question-hint">Select all that apply</span>}</legend><div className="engineering-answer-options">{question.options.map((option, optionIndex) => <label key={optionIndex} className="engineering-answer" data-selected={answers[index]?.includes(optionIndex) || undefined} data-correct={submitted && correctIndices(question).includes(optionIndex) || undefined} data-wrong={submitted && answers[index]?.includes(optionIndex) && !correctIndices(question).includes(optionIndex) || undefined}><input type={multiple ? 'checkbox' : 'radio'} name={`${path}-${index}`} checked={answers[index]?.includes(optionIndex) || false} onChange={event => setAnswers(previous => ({ ...previous, [index]: multiple ? event.target.checked ? [...(previous[index] || []), optionIndex] : (previous[index] || []).filter(value => value !== optionIndex) : [optionIndex] }))} /><span>{option}</span>{submitted && correctIndices(question).includes(optionIndex) && <Check aria-label="Correct answer" />}</label>)}</div>{submitted && <div className="engineering-explanation"><strong>{isCorrect(question, index) ? 'Correct.' : 'Review this answer.'}</strong> {question.explanation || `Correct ${multiple ? 'answers' : 'answer'}: ${correctIndices(question).map(i => question.options[i]).join('; ')}`}</div>}</fieldset>; })}
    <div className="engineering-quiz-actions">{submitted ? <Button type="button" variant="outline" onClick={() => { setAnswers({}); setSubmitted(false); }}>Try again</Button> : <Button type="submit" disabled={answered !== questions.length}>Submit answers <ArrowRight /></Button>}<span>{answered}/{questions.length} answered</span></div>
    {submitted && <div ref={resultRef} tabIndex={-1} className="engineering-quiz-result" role="status"><strong>{score} / {questions.length} correct · {Math.round(score / questions.length * 100)}%</strong><p>{score === questions.length ? 'All correct. This lesson is complete.' : 'Read the explanations, revisit the lesson, and try again.'}{data.track ? ' This is a raw practice score, not an official exam score.' : ''}</p></div>}
  </form></section>;
}

function Markdown({ html, path, onNavigate }) {
  const host = useRef(null);
  useEffect(() => {
    let alive = true;
    let cleanup;
    Promise.resolve(hydrateContent(host.current)).then(value => { if (alive) cleanup = value; else if (typeof value === 'function') value(); }).catch(() => { /* Static lesson remains readable if an optional enhancement cannot load. */ });
    return () => { alive = false; if (typeof cleanup === 'function') cleanup(); };
  }, [html, path]);
  return <div className="engineering-prose" ref={host} dangerouslySetInnerHTML={{ __html: html }} onClick={event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && (url.searchParams.has('path') || url.searchParams.has('folder'))) { event.preventDefault(); onNavigate(`${url.pathname}${url.search}${url.hash}`); }
  }} />;
}

function FileContent({ resource, path, catalog, navigate, onQuizComplete }) {
  if (resource.status === 'loading') return <div className="engineering-state" role="status">Loading lesson…</div>;
  if (resource.status === 'error') return <div className="engineering-state engineering-error" role="alert"><h2>Couldn’t open this file</h2><p>{resource.error}</p><a href={safeDownloadURL(path)} download>Download the original file</a></div>;
  if (resource.status !== 'ready') return null;
  if (resource.html !== undefined) return <>{resource.simulation && <Explainer key={path} data={resource.simulation} />}<Markdown html={resource.html} path={path} onNavigate={navigate} /></>;
  if (resource.quiz) return <Quiz key={path} path={path} data={resource.quiz} onComplete={onQuizComplete} />;
  if (imagePattern.test(path)) return <figure className="engineering-asset"><img src={contentURL(path)} alt={basename(path)} /><figcaption>{path}</figcaption></figure>;
  if (/\.pdf$/i.test(path)) return <div className="engineering-asset"><p>Read the PDF in your browser or download a copy.</p><Button asChild variant="outline"><a href={contentURL(path)} target="_blank" rel="noreferrer">Open PDF <ExternalLink /></a></Button></div>;
  if (binaryPattern.test(path)) return <div className="engineering-state"><File /><h2>{basename(path)}</h2><p>This original asset is available to download.</p><Button asChild><a href={contentURL(path)} download><Download />Download file</a></Button></div>;
  if (resource.data !== undefined) return <div className="engineering-record"><StructuredValue value={resource.data} catalog={catalog} navigate={navigate} /><details><summary>View original JSON</summary><pre><code>{resource.text}</code></pre></details></div>;
  return <div className="engineering-code-view"><div className="engineering-code-heading"><span>{path.split('.').pop()?.toUpperCase() || 'TEXT'}</span><span>{resource.text?.split('\n').length.toLocaleString()} lines</span></div><pre tabIndex={0} aria-label={`Source of ${basename(path)}`}><code>{resource.text}</code></pre></div>;
}

function StructuredValue({ value, catalog, navigate, depth = 0 }) {
  if (value === null) return <span className="engineering-muted">None</span>;
  if (typeof value === 'string') {
    const target = [value, `${value}/docs/en.md`, `${value}/README.md`].find(path => catalog.filePaths.has(path));
    if (target) return <RouteLink path={target} navigate={navigate}>{catalog.entryByPath.get(target)?.title || value}</RouteLink>;
    if (/^https?:\/\//.test(value)) return <a href={value} target="_blank" rel="noreferrer">{value}</a>;
    return <span>{value}</span>;
  }
  if (typeof value !== 'object') return <span>{String(value)}</span>;
  if (Array.isArray(value)) return <ol>{value.map((item, i) => <li key={i}>{item && typeof item === 'object' ? <details open={depth < 1}><summary>{item.title || item.name || item.id || item.label || `Item ${i + 1}`}</summary><StructuredValue value={item} catalog={catalog} navigate={navigate} depth={depth + 1} /></details> : <StructuredValue value={item} catalog={catalog} navigate={navigate} depth={depth + 1} />}</li>)}</ol>;
  return <dl>{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ')}</dt><dd><StructuredValue value={item} catalog={catalog} navigate={navigate} depth={depth + 1} /></dd></div>)}</dl>;
}

function RelatedFiles({ catalog, entry, path, navigate, tab, setTab }) {
  const related = useMemo(() => entry?.lessonRoot ? catalog.files.filter(file => file.path.startsWith(`${entry.lessonRoot}/`)) : [], [catalog, entry?.lessonRoot]);
  if (!related.length) return null;
  const code = related.filter(file => /\/(?:code|outputs)\//.test(file.path));
  return <section className="engineering-related"><div className="engineering-related-heading"><h2>Lesson files</h2><RouteLink folder={entry.lessonRoot} navigate={navigate}>Browse folder <ArrowRight /></RouteLink></div><div className="engineering-related-tabs" role="group" aria-label="Filter lesson files"><button type="button" aria-pressed={tab === 'artifacts'} onClick={() => setTab('artifacts')}>Code & artifacts <span>{code.length}</span></button><button type="button" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>All files <span>{related.length}</span></button></div><ul>{(tab === 'all' ? related : code).map(file => <li key={file.path}><RouteLink path={file.path} navigate={navigate} aria-current={path === file.path ? 'page' : undefined}><FileText /><span>{file.path.slice(entry.lessonRoot.length + 1)}</span><span>{humanSize(file.bytes || 0)}</span></RouteLink><a href={contentURL(file.path)} download aria-label={`Download ${basename(file.path)}`} title="Download original"><Download /></a></li>)}</ul>{tab !== 'all' && !code.length && <p className="engineering-muted">No code or output files are included for this lesson.</p>}</section>;
}

function TableOfContents({ headings, active, navigate, path }) {
  return headings.length ? <nav className="engineering-toc" aria-label="On this page"><h2>On this page</h2>{headings.filter(heading => heading.depth <= 3).map(heading => <a key={heading.id} href={`#${encodeURIComponent(heading.id)}`} data-depth={heading.depth} aria-current={active === heading.id ? 'location' : undefined} onClick={event => { event.preventDefault(); navigate(`${routeURL(path)}#${encodeURIComponent(heading.id)}`, { section: true }); }}>{heading.text}</a>)}</nav> : null;
}

function App() {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  const [route, setRoute] = useState(readRoute);
  const [resource, setResource] = useState({ status: 'idle' });
  const [theme, setTheme] = useState(() => { try { const saved = localStorage.getItem(THEME); if (saved === 'dark' || saved === 'light') return saved; } catch { /* Private browsing may not allow storage. */ } return document.documentElement.classList.contains('dark') ? 'dark' : 'light'; });
  const [completed, setCompleted] = useState(() => readStorage(STORAGE, {}));
  const [saved, setSaved] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [tab, setTab] = useState('artifacts');
  const [activeHeading, setActiveHeading] = useState('');
  const scrollRef = useRef(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const activeEntry = catalog?.entries.find(entry => entry.path === route.path) || catalog?.entries.find(entry => entry.lessonRoot && route.path.startsWith(`${entry.lessonRoot}/`));
  const activeGroup = catalog?.groups.find(group => group.entries.some(entry => entry.path === activeEntry?.path));
  const groupEntries = activeGroup?.entries || [];
  const entryIndex = groupEntries.findIndex(entry => entry.path === activeEntry?.path);
  const previous = groupEntries[entryIndex - 1];
  const next = groupEntries[entryIndex + 1];
  const title = route.folder !== null ? route.folder ? basename(route.folder) : 'All source files' : route.path ? activeEntry?.path === route.path ? activeEntry.title : basename(route.path) : 'AI engineering';
  const navigate = (url, options = {}) => {
    const target = new URL(url, location.href);
    if (`${target.pathname}${target.search}${target.hash}` !== `${location.pathname}${location.search}${location.hash}`) history.pushState({}, '', target);
    const nextRoute = readRoute(); setRoute(nextRoute); setMobileOpen(false); setTocOpen(false);
    if (!options.section && nextRoute.path !== route.path || nextRoute.folder !== route.folder) scrollRef.current?.scrollTo(0, 0);
    if (options.section || nextRoute.path === route.path && nextRoute.hash) requestAnimationFrame(() => scrollToHash(nextRoute.hash));
  };
  const scrollToHash = hash => { if (!hash) return; let id; try { id = decodeURIComponent(hash.slice(1)); } catch { id = hash.slice(1); } const target = document.getElementById(id); if (target && scrollRef.current?.contains(target)) target.scrollIntoView({ block: 'start' }); };
  const markComplete = (path, details = {}) => setCompleted(previous => { const value = { ...previous, [path]: { ...previous[path], ...details, completed: details.completed ?? true, updatedAt: new Date().toISOString() } }; setSaved(saveStorage(STORAGE, value)); return value; });
  useEffect(() => {
    const controller = new AbortController();
    fetch('./catalog.json', { signal: controller.signal }).then(response => { if (!response.ok) throw new Error(`The curriculum catalog returned ${response.status}.`); return response.json(); }).then(value => { if (!Array.isArray(value.entries) || !Array.isArray(value.files) || !Array.isArray(value.groups)) throw new Error('The curriculum catalog has an unsupported format.'); const byPath = new Map(value.entries.map(entry => [entry.path, entry])); value.entryByPath = byPath; value.filePaths = new Set(value.files.map(file => file.path)); value.groups = value.groups.map(group => ({ ...group, entries: group.entries.map(entry => typeof entry === 'string' ? byPath.get(entry) : entry).filter(Boolean) })); setCatalog(value); }).catch(error => { if (error.name !== 'AbortError') setCatalogError(error.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => { const pop = () => setRoute(readRoute()); window.addEventListener('popstate', pop); window.addEventListener('hashchange', pop); return () => { window.removeEventListener('popstate', pop); window.removeEventListener('hashchange', pop); }; }, []);
  useEffect(() => { const changed = event => { if (event.key === STORAGE) setCompleted(readStorage(STORAGE, {})); if (event.key === THEME && ['light', 'dark'].includes(event.newValue)) setTheme(event.newValue); }; window.addEventListener('storage', changed); return () => window.removeEventListener('storage', changed); }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.style.colorScheme = theme; try { localStorage.setItem(THEME, theme); } catch { /* Appearance remains usable when browser storage is unavailable. */ } }, [theme]);
  useEffect(() => { document.title = `${title} · AI engineering · Math as Code`; }, [title]);
  useEffect(() => { const key = event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (matchMedia('(max-width: 900px)').matches) { setMobileOpen(true); setTimeout(() => mobileSearchRef.current?.focus(), 50); } else { setSidebarOpen(true); setTimeout(() => searchRef.current?.focus(), 0); } } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
  useEffect(() => {
    if (!catalog || !route.path) { setResource({ status: 'idle' }); return; }
    const controller = new AbortController();
    setResource({ status: 'loading' });
    if (!catalog.files.some(file => file.path === route.path)) { setResource({ status: 'error', error: 'This path is not present in the imported curriculum. Choose a lesson from the navigation or browse all source files.' }); return () => controller.abort(); }
    if (binaryPattern.test(route.path) || imagePattern.test(route.path)) { setResource({ status: 'ready' }); return () => controller.abort(); }
    fetch(contentURL(route.path), { signal: controller.signal }).then(response => { if (!response.ok) throw new Error(`The source file returned ${response.status}.`); return response.text(); }).then(async text => {
      if (/\.md(?:own)?$/i.test(route.path) || catalog.entries.find(item => item.path === route.path)?.renderedPath) {
        const entry = catalog.entries.find(item => item.path === route.path);
        let renderingCatalog = catalog;
        let simulation;
        if (entry?.renderedPath) {
          const response = await fetch(entry.renderedPath, { signal: controller.signal });
          if (!response.ok) throw new Error(`The lesson rendering returned ${response.status}.`);
          const prebuilt = await response.json();
          renderingCatalog = { ...catalog, rendered: { [route.path]: prebuilt.html } };
          simulation = prebuilt.simulation;
        }
        const rendered = await renderContent(text, route.path, renderingCatalog);
        if (!controller.signal.aborted) setResource({ status: 'ready', ...rendered, simulation });
      }
      else { let quiz, data; if (/\.json$/i.test(route.path)) { try { data = JSON.parse(text); quiz = normalizeQuiz(data); if (quiz && !quiz.title) quiz.title = `${activeEntry?.title || 'Lesson'} — quiz`; } catch { /* Invalid JSON remains inspectable as source. */ } } if (!controller.signal.aborted) setResource({ status: 'ready', text, quiz, data }); }
    }).catch(error => { if (error.name !== 'AbortError' && !controller.signal.aborted) setResource({ status: 'error', error: error.message }); });
    return () => controller.abort();
  }, [catalog, route.path]);
  useEffect(() => {
    if (resource.status !== 'ready') return;
    const frame = requestAnimationFrame(() => { if (route.hash) scrollToHash(route.hash); else scrollRef.current?.scrollTo(0, 0); });
    const container = scrollRef.current;
    if (!container) return () => cancelAnimationFrame(frame);
    const headings = [...container.querySelectorAll('.engineering-prose h1[id], .engineering-prose h2[id], .engineering-prose h3[id]')];
    const update = () => { const top = container.getBoundingClientRect().top; let current = headings[0]?.id || ''; for (const heading of headings) { if (heading.getBoundingClientRect().top <= top + 100) current = heading.id; else break; } setActiveHeading(current); };
    container.addEventListener('scroll', update, { passive: true }); update();
    return () => { cancelAnimationFrame(frame); container.removeEventListener('scroll', update); };
  }, [resource, route.path]);
  if (catalogError) return <div className="engineering-boot engineering-error" role="alert"><h1>Couldn’t load the curriculum</h1><p>{catalogError}</p><Button onClick={() => location.reload()}>Reload</Button></div>;
  if (!catalog) return <div className="engineering-boot" role="status"><BookOpen /><span>Loading the curriculum…</span></div>;
  const sidebarProps = { catalog, route, navigate, completed, theme, setTheme };
  const headings = resource.headings || [];
  const certificationDisclaimer = route.path.startsWith('certifications/') ? catalog.programDisclaimers?.[route.path.split('/')[1]] : null;
  return <SidebarProvider className="engineering-provider"><a href="#engineering-main" className="skip-link">Skip to content</a><div className="engineering-shell" data-sidebar-open={sidebarOpen}>
    <div className="engineering-desktop-sidebar"><CurriculumSidebar {...sidebarProps} searchRef={searchRef} /></div>
    {!sidebarOpen && <aside className="topic-sidebar engineering-rail"><IconButton label="Open curriculum navigation" onClick={() => setSidebarOpen(true)}><PanelLeftOpen /></IconButton><RouteLink navigate={navigate} aria-label="Curriculum overview"><Home /></RouteLink><RouteLink folder="" navigate={navigate} aria-label="All source files"><Folder /></RouteLink></aside>}
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="topic-sheet engineering-mobile-sheet" showCloseButton={false}><SheetHeader className="sr-only"><SheetTitle>Curriculum navigation</SheetTitle><SheetDescription>Find a lesson, reference, or source file.</SheetDescription></SheetHeader><CurriculumSidebar {...sidebarProps} close={() => setMobileOpen(false)} searchRef={mobileSearchRef} /></SheetContent></Sheet>
    <div className="engineering-workspace"><header className="engineering-toolbar"><IconButton label="Open curriculum navigation" className="engineering-mobile-toggle" onClick={() => setMobileOpen(true)}><Menu /></IconButton><IconButton label={sidebarOpen ? 'Collapse curriculum navigation' : 'Open curriculum navigation'} className="engineering-desktop-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}</IconButton><div className="engineering-toolbar-title"><span>{activeGroup?.title || (route.folder !== null ? 'Source files' : 'The complete curriculum')}</span><strong>{title}</strong></div>{route.path && <><Button asChild variant="ghost" size="icon-sm"><a href={safeDownloadURL(route.path)} download aria-label="Download original file" title="Download original file"><Download /></a></Button>{headings.length > 0 && <IconButton className="engineering-toc-toggle" label="On this page" onClick={() => setTocOpen(true)}><List /></IconButton>}</>}<IconButton label={theme === 'dark' ? 'Use light appearance' : 'Use dark appearance'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</IconButton></header>
    <div className="engineering-reading-layout" data-toc={!!headings.length}><main id="engineering-main" ref={scrollRef} className="engineering-reader" tabIndex={-1}>
      <div className="engineering-reader-inner">{route.folder !== null ? <FileBrowser key={route.folder} catalog={catalog} folder={route.folder} navigate={navigate} /> : !route.path ? <Overview catalog={catalog} navigate={navigate} /> : <>
        <div className="engineering-file-location"><RouteLink folder={dirname(route.path)} navigate={navigate}><FolderOpen />{dirname(route.path) || 'Source'}</RouteLink>{activeEntry?.path !== route.path && activeEntry && <RouteLink path={activeEntry.path} navigate={navigate}>Back to lesson <ArrowRight /></RouteLink>}</div>
        {!/\.md(?:own)?$/i.test(route.path) && resource.html === undefined && resource.status !== 'loading' && <h1 className="engineering-file-title">{resource.quiz?.title || basename(route.path)}</h1>}
        <>{certificationDisclaimer && <p className="engineering-muted" style={{ marginBottom: 20 }}>{certificationDisclaimer}</p>}</><FileContent resource={resource} path={route.path} catalog={catalog} navigate={navigate} onQuizComplete={details => markComplete(activeEntry?.path || route.path, details)} />
        {resource.status === 'ready' && activeEntry && <><div className="engineering-lesson-actions">{activeEntry.quizPath && activeEntry.quizPath !== route.path && <Button asChild variant="outline"><RouteLink path={activeEntry.quizPath} navigate={navigate}>Take the quiz <ArrowRight /></RouteLink></Button>}<Button variant={completed[activeEntry.path]?.completed ? 'secondary' : 'outline'} onClick={() => markComplete(activeEntry.path, { completed: !completed[activeEntry.path]?.completed })}>{completed[activeEntry.path]?.completed && <Check />}{completed[activeEntry.path]?.completed ? 'Completed' : 'Mark lesson complete'}</Button><span>{saved ? 'Progress saved on this browser' : 'Progress is available for this session; browser storage is unavailable.'}</span></div><RelatedFiles catalog={catalog} entry={activeEntry} path={route.path} navigate={navigate} tab={tab} setTab={setTab} /><nav className="engineering-lesson-navigation" aria-label="Adjacent lessons">{previous ? <RouteLink path={previous.path} navigate={navigate}><ArrowLeft /><span><small>Previous lesson</small>{previous.title}</span></RouteLink> : <span />}{next ? <RouteLink path={next.path} navigate={navigate}><span><small>Next lesson</small>{next.title}</span><ArrowRight /></RouteLink> : <span />}</nav></>}
      </>}
      <footer className="engineering-attribution">Curriculum content from <a href={catalog.source?.url} target="_blank" rel="noreferrer">AI Engineering from Scratch</a>. Original authors retain their copyright; source licenses and notices are included in the <RouteLink folder="" navigate={navigate}>source snapshot</RouteLink>.{catalog.source?.revision && <span>Snapshot {catalog.source.revision.slice(0, 12)}</span>}</footer></div>
    </main>{headings.length > 0 && <aside className="engineering-desktop-toc"><TableOfContents headings={headings} active={activeHeading} navigate={navigate} path={route.path} /></aside>}</div>
    </div><Sheet open={tocOpen} onOpenChange={setTocOpen}><SheetContent side="right" className="engineering-toc-sheet"><SheetHeader><SheetTitle>On this page</SheetTitle><SheetDescription>Jump to a section in this lesson.</SheetDescription></SheetHeader><TableOfContents headings={headings} active={activeHeading} navigate={navigate} path={route.path} /></SheetContent></Sheet>
  </div></SidebarProvider>;
}

createRoot(document.getElementById('app')).render(<App />);
