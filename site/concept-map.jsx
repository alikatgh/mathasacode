import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { conceptMaps, renderConcept } from './concept-maps.mjs';

function ConceptFigure({ kind, language }) {
  const drawing = useRef(null);
  const [width, setWidth] = useState(720);
  const entry = conceptMaps[kind][language] || conceptMaps[kind].en;
  const diagram = useMemo(() => {
    // The lesson and a complete text explanation remain usable if SVG rendering
    // is unavailable. Authored diagrams are also parsed in the verification suite.
    try { return renderConcept(kind, language, width); } catch { return null; }
  }, [kind, language, width]);
  useLayoutEffect(() => {
    const element = drawing.current;
    const update = () => {
      const measured = Math.floor(element.clientWidth);
      if (measured > 0) setWidth(current => current === measured ? current : measured);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const titleId = `visual-${kind}-title`;
  return <Card className="concept-map shadow-none" role="figure" aria-labelledby={titleId}>
    <CardHeader className="concept-map__heading">
      <span className="concept-map__eyebrow">{language === 'zh' ? '概念图' : 'Concept map'}</span>
      <CardTitle id={titleId} className="concept-map__title">{entry.title}</CardTitle>
    </CardHeader>
    <CardContent className="concept-map__body">
      <div ref={drawing} className="concept-map__viewport" tabIndex={diagram?.width > width ? 0 : undefined} role={diagram?.width > width ? 'region' : undefined} aria-label={diagram?.width > width ? (language === 'zh' ? '可横向滚动的概念图' : 'Scrollable concept map') : undefined}>
        <div className="concept-map__drawing" style={diagram ? { width: diagram.width, height: diagram.height } : undefined} aria-hidden="true" dangerouslySetInnerHTML={{ __html: diagram?.svg || '' }} />
      </div>
      <ol className={diagram ? 'sr-only' : 'concept-map__fallback'}>{entry.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
      <p className="concept-map__takeaway">{entry.takeaway}</p>
    </CardContent>
  </Card>;
}

export function ConceptMap({ kind, topic, language }) {
  const [mounted, setMounted] = useState(false);
  const [host] = useState(() => {
    const element = topic.element.ownerDocument.createElement('div');
    element.className = 'concept-map-slot';
    return element;
  });
  useLayoutEffect(() => {
    // Keep the visual in the continuous lesson, immediately before its practice.
    // The reader still owns its original pages, anchors and saved scroll state.
    const practice = topic.element.querySelector('.learn-panel');
    if (practice) practice.before(host);
    else topic.element.append(host);
    setMounted(true);
    return () => host.remove();
  }, [topic, host]);
  return mounted ? createPortal(<ConceptFigure kind={kind} language={language} />, host) : null;
}
