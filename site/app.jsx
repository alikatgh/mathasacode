import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, BookOpen, Check, Code2, FlaskConical, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { NativeSelect, NativeSelectOption } from './components/ui/native-select';
import { Progress } from './components/ui/progress';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from './components/ui/resizable';
import { ScrollArea } from './components/ui/scroll-area';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from './components/ui/sheet';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from './components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { Badge } from './components/reui/badge';
import { initializeReader, decodeReaderHash } from './reader.mjs';
import { prepareLearning, LearningPortals } from './learning.jsx';
import { learningText } from './learning-model.mjs';
import { prepareCodeExamples, CodeExamplePortals } from './reui-examples.jsx';
import { conceptForTopic } from './concept-maps.mjs';
import { ConceptMap } from './concept-map.jsx';
import { prepareComparisons, ComparisonPortals } from './comparison-frames.jsx';

const zh = document.documentElement.lang.startsWith('zh');
const guide = document.body.dataset.guide === 'true';
const words = zh ? {
  subtitle: '写给程序员的数学指南', reference: '数学参考', search: '搜索主题或符号…', clear: '清除搜索',
  contents: '全部主题', noResults: '没有找到匹配的主题。', progress: '练习进度', topics: '主题',
  close: '关闭主题导航', open: '打开主题导航', nextTopic: '下一主题',
  practice: '练习', of: '/', versions: '指南版本',
  map: '概念图', completed: '已完成', source: '源代码', overview: '概览', lesson: '指南',
  resources: '项目资料', contribute: '贡献', license: '许可证', local: '本地运行', blog: '博客', changelog: '更新日志', theme: '切换主题', help: '搜索主题名称或数学符号。'
} : {
  subtitle: 'A programmer’s field guide', reference: 'The reference', search: 'Find a topic or symbol…', clear: 'Clear search',
  contents: 'All topics', noResults: 'No matching topics. Try another term.', progress: 'Your practice', topics: 'topics',
  close: 'Close topic navigation', open: 'Open topic navigation', nextTopic: 'Next topic',
  practice: 'Practice', of: 'of', versions: 'Guide version',
  map: 'Concept map', completed: 'Completed', source: 'Source', overview: 'Overview', lesson: 'Guide',
  resources: 'Project', contribute: 'Contributing', license: 'License', local: 'Run locally', blog: 'Blog', changelog: 'Changelog', theme: 'Toggle theme', help: 'Search topic names or mathematical symbols.'
};
const titleCase = text => text ? text[0].toUpperCase() + text.slice(1) : '';
const href = id => `#${encodeURIComponent(id)}`;
const resources = [['/CONTRIBUTING.html', words.contribute], ['/run-locally.html', words.local], ['/LICENSE.html', words.license], ['/blog.html', words.blog], ['/changelog.html', words.changelog]];

export function guideVersionPath(pathname) {
  const path = pathname.replace(/\/+$/, '');
  if (/\/machine-learning(?:\.html)?$/.test(path)) return '/machine-learning.html';
  if (/\/README-zh(?:\.html)?$/.test(path)) return '/README-zh.html';
  if (/\/PYTHON-README(?:\.html)?$/.test(path)) return '/PYTHON-README.html';
  return '/';
}

function IconButton({ label, children, ...props }) {
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" type="button" aria-label={label} {...props}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

function TopicSidebar({ controller, snapshot, labels, model, searchRef, onNavigate, settings, mobile = false }) {
  const progress = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const [query, setQuery] = useState('');
  const active = useRef(null);
  const list = useRef(null);
  const normalized = query.trim().toLocaleLowerCase();
  const matches = controller.topics.map((topic, index) => ({ topic, index })).filter(({ topic }) => `${topic.title} ${labels.get(topic.id) || ''}`.toLocaleLowerCase().includes(normalized));
  const completeHeadings = new Set(model.entries.filter(entry => progress.completed.has(entry.activity.id)).map(entry => entry.heading.id));
  useEffect(() => {
    const viewport = list.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (!active.current || !viewport || normalized) return;
    const row = active.current.getBoundingClientRect();
    const panel = viewport.getBoundingClientRect();
    if (row.top < panel.top) viewport.scrollTop += row.top - panel.top - 8;
    else if (row.bottom > panel.bottom) viewport.scrollTop += row.bottom - panel.bottom + 8;
  }, [snapshot.topicIndex, normalized]);
  return <Sidebar collapsible="none" className="topic-sidebar w-full" aria-label={words.contents}>
    <SidebarHeader className="gap-2 p-3 pb-1">
      <nav aria-label={zh ? '学习内容' : 'Learning sections'} className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1">
        {[[zh ? '数学参考' : 'Math reference', '/'], [zh ? 'ML · 最终挑战' : 'ML · final boss', '/machine-learning.html#the-final-boss']].map(([label, url]) => {
          const active = url.startsWith('/machine-learning') ? location.pathname.startsWith('/machine-learning') : !location.pathname.startsWith('/machine-learning');
          return <Button key={url} asChild variant={active ? 'secondary' : 'ghost'} size="sm" className="h-7 min-w-0 px-1 text-[11px]"><a href={url} aria-current={active ? 'page' : undefined}>{label}</a></Button>;
        })}
      </nav>
      <div className="relative flex items-center"><Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" /><Input ref={searchRef} type="search" className="pr-10 pl-9" aria-label={words.search} placeholder={words.search} value={query} onChange={event => setQuery(event.target.value)} />{query ? <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1" aria-label={words.clear} onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X /></Button> : !mobile && <kbd className="pointer-events-none absolute right-3 text-[10px] text-muted-foreground">⌘ K</kbd>}</div>
    </SidebarHeader>
    <SidebarContent className="min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-2 pb-1"><span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{words.contents}</span><Badge variant="secondary" size="sm">{matches.length}</Badge></div>
      <ScrollArea ref={list} className="min-h-0 flex-1">
        <nav aria-label={words.contents} className="px-2 pb-2"><SidebarMenu>
          {matches.map(({ topic, index }) => <SidebarMenuItem key={topic.id}><SidebarMenuButton asChild isActive={snapshot.topicIndex === index} className={`topic-link h-auto min-h-7 py-1${Number(topic.heading.tagName.slice(1)) > 2 ? ' pl-5' : ''}`}>
            <a ref={snapshot.topicIndex === index ? active : undefined} href={href(topic.id)} aria-current={snapshot.topicIndex === index ? 'location' : undefined} onClick={onNavigate}><span className="topic-index">{String(index + 1).padStart(2, '0')}</span><span className="topic-label">{index === 0 && guide ? words.overview : titleCase(labels.get(topic.id) || topic.title)}</span>{completeHeadings.has(topic.id) && <Check className="ml-auto size-3.5 text-primary" aria-label={words.completed} />}</a>
          </SidebarMenuButton></SidebarMenuItem>)}
        </SidebarMenu>{!matches.length && <p className="p-3 text-sm text-muted-foreground" role="status">{words.noResults}</p>}</nav>
      </ScrollArea>
    </SidebarContent>
    <SidebarFooter className="gap-3 border-t p-3">
      {progress.total > 0 && <div className="space-y-1.5 px-1"><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-medium"><BookOpen className="size-3.5 text-primary" />{words.progress}</span><span className="font-mono text-[10px] text-muted-foreground">{progress.done}/{progress.total}</span></div><Progress value={progress.done / progress.total * 100} aria-label={`${progress.done} ${words.of} ${progress.total} ${words.completed}`} className="h-1" /><p className="text-[10px] leading-relaxed text-muted-foreground">{learningText[model.language][progress.available ? 'saved' : 'unsaved']}</p></div>}
      {settings}
      <div className="flex flex-wrap gap-x-3 gap-y-1">{resources.map(([url, label]) => <Button key={url} asChild variant="link" size="xs" className="h-auto p-0 text-[10px] text-muted-foreground"><a href={url}>{label}</a></Button>)}</div>
    </SidebarFooter>
  </Sidebar>;
}

function LessonContent({ controller }) {
  const host = useRef(null);
  useLayoutEffect(() => { host.current.append(controller.main); }, [controller]);
  return <div className="lesson-content" ref={host} />;
}

function LessonWorkspace({ controller, snapshot, navigationToggle }) {
  const area = useRef(null);
  const topic = controller.topics[snapshot.topicIndex];
  useLayoutEffect(() => {
    const viewport = area.current.querySelector('[data-slot="scroll-area-viewport"]');
    viewport.classList.add('reader-viewport');
    viewport.tabIndex = -1;
    viewport.setAttribute('aria-labelledby', 'app-topic-title');
    return controller.attachViewport(viewport);
  }, [controller]);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => controller.restoreViewport());
    return () => cancelAnimationFrame(frame);
  }, [controller, snapshot]);
  const hasPrevious = snapshot.topicIndex > 0;
  const hasNext = snapshot.topicIndex < controller.topics.length - 1;
  const practice = topic.pages.find(item => item.practice);
  const concept = guide ? conceptForTopic(topic.id) : null;
  return <div className="lesson-workspace">
    <header className="lesson-heading border-b bg-background">
      <div className="lesson-eyebrow flex items-center justify-between text-[10px] tracking-widest text-muted-foreground uppercase"><span className="flex items-center gap-2">{navigationToggle}<span>{guide ? words.reference : words.resources}</span></span><span className="font-mono">{String(snapshot.topicIndex + 1).padStart(2, '0')} / {controller.topics.length}</span></div>
      <div className="lesson-title-row"><h1 id="app-topic-title">{snapshot.topicIndex === 0 && guide ? 'Math as Code' : titleCase(topic.title)}</h1>{practice && <Button asChild variant="outline" size="sm"><a href={href(practice.id)}><FlaskConical className="size-3.5" />{words.practice}</a></Button>}</div>
    </header>
    <ScrollArea ref={area} className="reader-scroll min-h-0" aria-label={titleCase(topic.title)}><div className="lesson-inner"><LessonContent controller={controller} />{concept && <ConceptMap key={topic.id} kind={concept} topic={topic} language={zh ? 'zh' : 'en'} />}</div></ScrollArea>
    <footer className="lesson-navigation border-t bg-background" aria-label={zh ? '阅读导航' : 'Reading navigation'}><Button variant="outline" disabled={!hasPrevious} onClick={() => controller.navigate(href(controller.topics[snapshot.topicIndex - 1].id))} className="navigation-previous"><ArrowLeft className="size-4" /><span>{zh ? '上一主题' : 'Previous topic'}</span></Button><Button disabled={!hasNext} onClick={() => controller.navigate(href(controller.topics[snapshot.topicIndex + 1].id))} className="navigation-next"><span>{words.nextTopic}</span><ArrowRight className="size-4" /></Button></footer>
  </div>;
}

function App({ controller, labels, model, examples, comparisons }) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 900px)').matches);
  const [sidebarOpen, setSidebarOpen] = useState(() => { try { return localStorage.getItem('math-as-code-sidebar-v1') !== 'closed'; } catch { return true; } });
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('math-as-code-theme-v1') === 'dark'; } catch { return false; } });
  const search = useRef(null);
  const mobileSearch = useRef(null);
  const selectedRoute = useRef(false);
  useLayoutEffect(() => { document.documentElement.classList.toggle('dark', dark); try { localStorage.setItem('math-as-code-theme-v1', dark ? 'dark' : 'light'); } catch {} }, [dark]);
  useEffect(() => { try { localStorage.setItem('math-as-code-sidebar-v1', sidebarOpen ? 'open' : 'closed'); } catch {} }, [sidebarOpen]);
  useEffect(() => {
    const media = matchMedia('(max-width: 900px)');
    const change = () => { setCompact(media.matches); if (!media.matches) setMobileOpen(false); };
    media.addEventListener('change', change);
    const keydown = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (media.matches) { selectedRoute.current = false; setMobileOpen(true); }
        else { setSidebarOpen(true); requestAnimationFrame(() => search.current?.focus({ preventScroll: true })); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { media.removeEventListener('change', change); document.removeEventListener('keydown', keydown); };
  }, []);
  const version = guideVersionPath(location.pathname);
  const settings = <div className="sidebar-settings flex items-center gap-1">
    <a href="/" className="sidebar-logo" aria-label="Math as Code"><span className="sidebar-logo__crop" aria-hidden="true"><img className="sidebar-logo__image" src="/assets/logo.png" width="1254" height="1254" alt="" decoding="async" /></span></a>
    <NativeSelect size="sm" aria-label={words.versions} value={version} onChange={event => { location.href = event.target.value; }}><NativeSelectOption value="/">English · JS</NativeSelectOption><NativeSelectOption value="/PYTHON-README.html">English · Python</NativeSelectOption><NativeSelectOption value="/README-zh.html">中文</NativeSelectOption>{version === '/machine-learning.html' && <NativeSelectOption value="/machine-learning.html">ML · English</NativeSelectOption>}</NativeSelect>
    <IconButton label={words.theme} onClick={() => setDark(value => !value)}>{dark ? <Sun /> : <Moon />}</IconButton>
    <IconButton label={words.source} asChild><a href="https://github.com/alikatgh/mathasacode"><Code2 /></a></IconButton>
  </div>;
  const sidebar = (mobile = false) => <TopicSidebar controller={controller} snapshot={snapshot} labels={labels} model={model} searchRef={mobile ? mobileSearch : search} mobile={mobile} settings={settings} onNavigate={mobile ? () => { selectedRoute.current = true; setMobileOpen(false); } : undefined} />;
  const toggle = compact
    ? <SheetTrigger asChild><Button variant="ghost" size="icon-sm" type="button" aria-label={words.open}><Menu /></Button></SheetTrigger>
    : <IconButton label={sidebarOpen ? (zh ? '隐藏侧栏' : 'Hide sidebar') : (zh ? '显示侧栏' : 'Show sidebar')} size="icon-sm" aria-expanded={sidebarOpen} aria-controls="chapter-pane" onClick={() => setSidebarOpen(value => !value)}>{sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}</IconButton>;
  return <TooltipProvider><SidebarProvider className="app-provider min-h-0"><div className="app-shell">
    <Sheet open={mobileOpen} onOpenChange={value => { if (value) selectedRoute.current = false; setMobileOpen(value); }}>
      <div className="app-workspace"><ResizablePanelGroup orientation="horizontal" disabled={compact || !sidebarOpen} data-sidebar-open={sidebarOpen} className="app-panels"><ResizablePanel id="chapter-pane" defaultSize="20%" minSize={224} maxSize={360} className="chapter-pane">{sidebar()}</ResizablePanel><ResizableHandle className="app-resize-handle" /><ResizablePanel id="lesson-pane" defaultSize="80%" minSize={compact ? 0 : 320} className="lesson-pane"><LessonWorkspace controller={controller} snapshot={snapshot} navigationToggle={toggle} /></ResizablePanel></ResizablePanelGroup></div>
      <SheetContent side="left" showCloseButton={false} className="topic-sheet flex w-[min(360px,92vw)] flex-col gap-0 p-0" onOpenAutoFocus={event => { event.preventDefault(); mobileSearch.current?.focus({ preventScroll: true }); }} onCloseAutoFocus={event => { if (selectedRoute.current) { event.preventDefault(); controller.topics[controller.getSnapshot().topicIndex].pages[controller.getSnapshot().pageIndex].element.focus({ preventScroll: true }); } }}><SheetHeader className="flex-row items-center justify-between border-b px-3 py-2"><div><SheetTitle>{words.contents}</SheetTitle><SheetDescription className="sr-only">{words.help}</SheetDescription></div><SheetClose asChild><Button variant="ghost" size="icon" aria-label={words.close}><X /></Button></SheetClose></SheetHeader><div className="min-h-0 flex-1">{sidebar(true)}</div></SheetContent>
    </Sheet>
    <ComparisonPortals comparisons={comparisons} /><LearningPortals model={model} /><CodeExamplePortals examples={examples} controller={controller} />
  </div></SidebarProvider></TooltipProvider>;
}

function startApp() {
  const main = document.querySelector('main');
  if (!main) return;
  const contents = [...main.querySelectorAll(':is(h1,h2,h3,h4)')].find(heading => /^(?:contents|table of contents|目录)$/i.test(heading.textContent.trim()));
  const list = contents?.nextElementSibling;
  const labels = new Map([...(list?.matches('ul') ? list.querySelectorAll('a[href^="#"]') : [])].map(anchor => [decodeReaderHash(anchor.hash), anchor.textContent.trim()]));
  const model = prepareLearning(main);
  const controller = initializeReader();
  if (!controller) return;
  const comparisons = prepareComparisons(main);
  const examples = prepareCodeExamples(main);
  const root = document.createElement('div'); root.id = 'app'; document.body.prepend(root);
  document.querySelector('body > nav')?.remove();
  document.body.classList.add('app-ready', 'style-vega');
  createRoot(root).render(<App controller={controller} labels={labels} model={model} examples={examples} comparisons={comparisons} />);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp, { once: true });
else startApp();
