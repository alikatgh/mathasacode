import { arithmeticDetails } from './symbol-details-arithmetic.mjs';
import { conceptDetails } from './symbol-details-concepts.mjs';
import { statisticsDetails } from './symbol-details-statistics.mjs';

// Kept outside the compact catalog: longer explanations are rendered to HTML
// during the build, rather than copied into the browser's JavaScript bundle.
export const symbolDetails = Object.freeze({ ...arithmeticDetails, ...conceptDetails, ...statisticsDetails });

const mdn = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/';
const references = {
  math: { title: 'JavaScript Math reference · MDN', href: `${mdn}Reference/Global_Objects/Math` },
  array: { title: 'JavaScript arrays · MDN', href: `${mdn}Reference/Global_Objects/Array` },
  set: { title: 'JavaScript sets · MDN', href: `${mdn}Reference/Global_Objects/Set` },
  operators: { title: 'JavaScript operators · MDN', href: `${mdn}Guide/Expressions_and_operators` },
  functions: { title: 'JavaScript functions · MDN', href: `${mdn}Guide/Functions` },
};

export function referenceForSymbol(entry) {
  if (/\bnew Set\b|\.has\(/.test(entry.code)) return references.set;
  if (/Math\./.test(entry.code)) return references.math;
  if (/\.map\(|\.reduce\(|\.filter\(|\.every\(|\.some\(|Array\./.test(entry.code)) return references.array;
  if (/=>|function\b/.test(entry.code)) return references.functions;
  return references.operators;
}
