import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './components/ui/card';

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
    notation.current.append(comparison.notation);
    implementation.current.append(comparison.implementation);
    return () => {
      comparison.element.insertBefore(comparison.notation, comparison.host);
      comparison.element.insertBefore(comparison.implementation, comparison.host);
    };
  }, [comparison]);
  return <Card className="comparison-frame gap-0 overflow-hidden py-0 shadow-none"><div className="comparison-grid"><div className="min-w-0" ref={notation} /><div className="min-w-0" ref={implementation} /></div></Card>;
}

export function ComparisonPortals({ comparisons }) {
  return comparisons.map((comparison, index) => createPortal(<Comparison comparison={comparison} />, comparison.host, `comparison-${index}`));
}
