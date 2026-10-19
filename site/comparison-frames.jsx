import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './components/ui/card';

/** Move the authored lead-in into the math context without cloning its content. */
export function moveComparisonProse(notation, implementation) {
  const paragraphs = [...implementation.querySelectorAll(':scope > p:not(.comparison__label)')];
  if (!paragraphs.length) return () => {};
  const context = notation.ownerDocument.createElement('div');
  context.className = 'comparison-context';
  const positions = paragraphs.map(paragraph => {
    const position = notation.ownerDocument.createComment('comparison prose position');
    paragraph.before(position);
    context.append(paragraph);
    return { paragraph, position };
  });
  // Formula, explanation, implementation retain their authored reading order.
  notation.append(context);
  return () => {
    for (const { paragraph, position } of positions) position.replaceWith(paragraph);
    context.remove();
  };
}

// Mathematical content stays in its authored DOM, inside actual ReUI frames.
export function prepareComparisons(main) {
  return [...main.querySelectorAll('.comparison')].map(element => {
    const notation = element.querySelector(':scope > .comparison__notation');
    const implementation = element.querySelector(':scope > .comparison__implementation');
    const host = element.ownerDocument.createElement('div');
    element.append(host);
    return { element, notation, implementation, host };
  });
}

function Comparison({ comparison }) {
  const notation = useRef(null);
  const implementation = useRef(null);
  useLayoutEffect(() => {
    const restoreProse = moveComparisonProse(comparison.notation, comparison.implementation);
    notation.current.append(comparison.notation);
    implementation.current.append(comparison.implementation);
    return () => {
      restoreProse();
      comparison.element.insertBefore(comparison.notation, comparison.host);
      comparison.element.insertBefore(comparison.implementation, comparison.host);
    };
  }, [comparison]);
  return <Card className="comparison-frame gap-0 overflow-hidden py-0 shadow-none"><div className="comparison-grid"><div className="min-w-0" ref={notation} /><div className="min-w-0" ref={implementation} /></div></Card>;
}

export function ComparisonPortals({ comparisons }) {
  return comparisons.map((comparison, index) => createPortal(<Comparison comparison={comparison} />, comparison.host, `comparison-${index}`));
}
