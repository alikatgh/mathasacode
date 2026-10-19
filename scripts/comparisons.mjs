const equationUrl = /^https?:\/\/latex\.codecogs\.com\/svg\.latex\?/i;

// Only whole equation paragraphs become display math. Inline notation stays in
// its sentence, including sentences containing several mathematical symbols.
export function isEquationParagraph(token) {
  return token?.type === 'paragraph' && token.tokens?.some(item => item.type === 'image' && equationUrl.test(item.href)) &&
    token.tokens.every(item => item.type === 'image' && equationUrl.test(item.href) ||
      item.type === 'text' && /^[\s.,;:，。；：]*$/.test(item.text));
}

const isComment = token => token.type === 'html' && /^\s*<!--[\s\S]*-->\s*$/.test(token.text);
// Authors can stop automatic pairing when prose changes to a different example.
const isBreak = token => token.type === 'html' && /<!--\s*comparison:break\s*-->/.test(token.text);
const isBridge = token => !isBreak(token) && (token.type === 'space' || token.type === 'paragraph' || isComment(token));

// These authored sections intentionally switch examples before their code. A
// nearby equation alone is not enough evidence to associate the two examples.
const ambiguousHeadings = /^(?:function notation|函数符号|intervals|区间（intervals）)$/i;

export function pairComparisons(tokens) {
  const result = [];
  let boundary = 0;
  let heading = '';
  for (const token of tokens) {
    if (token.type === 'heading') {
      heading = token.text.trim();
      result.push(token);
      boundary = result.length;
      continue;
    }
    if (token.type !== 'code') {
      result.push(token);
      continue;
    }
    let equation = -1;
    if (!ambiguousHeadings.test(heading)) {
      for (let i = result.length - 1; i >= boundary; i--) {
        if (!isBridge(result[i])) break;
        if (isEquationParagraph(result[i])) { equation = i; break; }
      }
    }
    if (equation >= 0) {
      // A contiguous group, such as floor and ceil, shares one implementation.
      let cursor = equation - 1;
      while (cursor >= boundary) {
        if (result[cursor].type === 'space' || isComment(result[cursor]) && !isBreak(result[cursor])) { cursor--; continue; }
        if (!isEquationParagraph(result[cursor])) break;
        equation = cursor--;
      }
      const notation = result.splice(equation);
      const implementation = [];
      // Keep the code's introductory sentence beside its code, in source order.
      let last = notation.length - 1;
      while (last >= 0 && (notation[last].type === 'space' || isComment(notation[last]))) last--;
      if (last > 0 && notation[last].type === 'paragraph' && /[:：]\s*$/.test(notation[last].text)) {
        implementation.push(...notation.splice(last));
      }
      implementation.push(token);
      result.push({ type: 'comparison', raw: '', notation, implementation, lang: token.lang });
    } else {
      result.push(token);
    }
    boundary = result.length;
  }
  // Marked stores reference-link definitions on the top-level token array.
  result.links = tokens.links;
  return result;
}
