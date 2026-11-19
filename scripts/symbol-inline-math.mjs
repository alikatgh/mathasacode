import katex from 'katex';
import { extraMathPhrases } from '../site/symbol-explanation-math.mjs';

const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const raw = String.raw;

// Explicit mathematical phrases keep grouping and meaning intact. The rest of
// the scanner recognizes only bounded numeric expressions and known notation;
// prose and JavaScript source never become executable HTML or TeX commands.
export const mathPhrases = new Map([
  ['fee(k) := 3 + 2k', raw`\operatorname{fee}(k):=3+2k`],
  ['fee(4) = 3 + 2 × 4 = 11',raw`\operatorname{fee}(4)=3+2\times4=11`],
  ['fee(6) = 3 + 2 × 6 = 15',raw`\operatorname{fee}(6)=3+2\times6=15`],
  ['3 × (2 + 4) = 18',raw`3\times(2+4)=18`],
  ['|10.02 − 10.00| ≈ 0.02',raw`\lvert10.02-10.00\rvert\approx0.02`],
  ['(2 + 3i)² = 4 + 12i + 9i²',raw`(2+3\mathrm{i})^2=4+12\mathrm{i}+9\mathrm{i}^2`],
  ['4 + 12i − 9 = −5 + 12i',raw`4+12\mathrm{i}-9=-5+12\mathrm{i}`],
  ['i² = −1',raw`\mathrm{i}^2=-1`],
  ['2 + 3i',raw`2+3\mathrm{i}`],['3 − i',raw`3-\mathrm{i}`],['1 + 2i',raw`1+2\mathrm{i}`],['4 + i',raw`4+\mathrm{i}`],
  ['3⁻³ = 1 / 27 ≈ 0.037037',raw`3^{-3}=\frac{1}{27}\approx0.037037`],
  ['log₂32 = 5',raw`\log_2 32=5`],['ln(32) / ln(2)',raw`\frac{\ln32}{\ln2}`],['e^(ln 32) ≈ 32',raw`\mathrm{e}^{\ln32}\approx32`],
  ['60 × π / 180 = π / 3',raw`\frac{60\pi}{180}=\frac{\pi}{3}`],
  ['2 cos(π / 3) ≈ 1.000',raw`2\cos\!\left(\frac{\pi}{3}\right)\approx1.000`],
  ['2 sin(π / 3) ≈ 1.732',raw`2\sin\!\left(\frac{\pi}{3}\right)\approx1.732`],
  ['tan(π / 3) ≈ 1.732',raw`\tan\!\left(\frac{\pi}{3}\right)\approx1.732`],
  ['4! / (2! × 2!) = 6',raw`\frac{4!}{2!\times2!}=6`],
  ['x₂ = 7',raw`x_2=7`],['s = −3',raw`s=-3`],['v̂ = [0.6, 0.8]',raw`\hat{\mathbf v}=[0.6,0.8]`],
  ['−3 × (−1) = 3',raw`-3\times(-1)=3`],
  ['a × b = [0, 0, 6]',raw`\mathbf a\times\mathbf b=[0,0,6]`],['b × a = [0, 0, −6]',raw`\mathbf b\times\mathbf a=[0,0,-6]`],
  ['3 − (−4) = 7',raw`3-(-4)=7`],['(−8)² = 64',raw`(-8)^2=64`],
  ['√(36 + 64) = 10',raw`\sqrt{36+64}=10`],['√(0.36 + 0.64) = 1',raw`\sqrt{0.36+0.64}=1`],
  ['det A = 6 − 0 = 6',raw`\det\mathbf A=6-0=6`],['ad − bc',raw`ad-bc`],
  ['ℕ = {0, 1, 2, …}',raw`\mathbb N=\{0,1,2,\ldots\}`],
  ['3 ∈ A',raw`3\in A`],['6 ∉ A',raw`6\notin A`],['A ∋ 3',raw`A\ni3`],
  ['A ∖ B = {1}',raw`A\setminus B=\{1\}`],['B ∖ A',raw`B\setminus A`],['A ∖ B',raw`A\setminus B`],['|A| = 3',raw`\lvert A\rvert=3`],
  ['[0, 1]³',raw`[0,1]^3`],['(0, 1)',raw`(0,1)`],['[0, 1]',raw`[0,1]`],['[0, 1)',raw`[0,1)`],['(0, 1]',raw`(0,1]`],
  ['f(x) = (x² − x)/x',raw`f(x)=\frac{x^2-x}{x}`],['(9 − 3)/3 = 2',raw`\frac{9-3}{3}=2`],['(1 − 1)/1 = 0',raw`\frac{1-1}{1}=0`],
  ['f(x, y) = x² + 3y',raw`f(x,y)=x^2+3y`],
  ['f(x) = x²',raw`f(x)=x^2`],['f(x) = 2x',raw`f(x)=2x`],['F(x) = x² + C',raw`F(x)=x^2+C`],
  ['f(x) = 2x − 3',raw`f(x)=2x-3`],['g(x) = max(0, x)',raw`g(x)=\max(0,x)`],
  ['(g ∘ f)(1) = 0',raw`(g\circ f)(1)=0`],['f(g(1)) = f(1) = −1',raw`f(g(1))=f(1)=-1`],
  ['x′ = x + 1',raw`x'=x+1`],['floor(−2.3) = −3',raw`\lfloor-2.3\rfloor=-3`],['ceil(−2.3) = −2',raw`\lceil-2.3\rceil=-2`],
  ['Δx = 3 − 2 = 1',raw`\Delta x=3-2=1`],['Δf = 9 − 4 = 5',raw`\Delta f=9-4=5`],
  ['f(2) = 4',raw`f(2)=4`],['f(3) = 9',raw`f(3)=9`],
  ['φ(x) = x²',raw`\varphi(x)=x^2`],['∫ δ(x − 3) φ(x) dx = φ(3)',raw`\int_{-\infty}^{\infty}\delta(x-3)\varphi(x)\,dx=\varphi(3)`],['φ(3) = 3² = 9',raw`\varphi(3)=3^2=9`],
  ['((3 + h)² − 9)/h',raw`\frac{(3+h)^2-9}{h}`],['h ≠ 0',raw`h\ne0`],
  ['(9.006001 − 8.994001)/0.002 ≈ 6',raw`\frac{9.006001-8.994001}{0.002}\approx6`],
  ['f(3.001) = 9.006001',raw`f(3.001)=9.006001`],['f(2.999) = 8.994001',raw`f(2.999)=8.994001`],
  ['f′(x) = 2x',raw`f'(x)=2x`],['f″(x) = 2',raw`f''(x)=2`],['∂f/∂x = 2x = 6',raw`\frac{\partial f}{\partial x}=2x=6`],['∂f/∂y = 3',raw`\frac{\partial f}{\partial y}=3`],['∇f(3, 4) = [6, 3]',raw`\nabla f(3,4)=[6,3]`],
  ['∫ from 0 to 1 of x² dx',raw`\int_0^1 x^2\,dx`],['x³/3',raw`\frac{x^3}{3}`],['F(1) − F(0) = 1/3',raw`F(1)-F(0)=\frac13`],
  ['0.005² × 0.01 = 0.00000025',raw`0.005^2\times0.01=0.00000025`],
  ['ωᵢ = (0, √3/2, 0.5)',raw`\boldsymbol\omega_i=(0,\frac{\sqrt3}{2},0.5)`],['n = (0, 0, 1)',raw`\mathbf n=(0,0,1)`],
  ['0 × 0 + 0 × √3/2 + 1 × 0.5 = 0.5',raw`0\times0+0\times\frac{\sqrt3}{2}+1\times0.5=0.5`],
  ['E⊥ = 8',raw`E_\perp=8`],['Lₒ = (R/π)E = (0.5/π) × π',raw`L_o=\frac{R}{\pi}E=\frac{0.5}{\pi}\times\pi`],['R = 0.5',raw`R=0.5`],['E = π',raw`E=\pi`],
  ['P(A) = 3 / 6 = 0.5',raw`P(A)=\frac36=0.5`],['E[X] = 2.5',raw`\mathbb E[X]=2.5`],['σ² = 20 / 4 = 5',raw`\sigma^2=\frac{20}{4}=5`],['σ = √5',raw`\sigma=\sqrt5`],
  ['P(A given B) = 2 / 3',raw`P(A\mid B)=\frac23`],['90 / 585 ≈ 0.153846',raw`\frac{90}{585}\approx0.153846`],
  ['covariance = 4 / 3',raw`\operatorname{Cov}(X,Y)=\frac43`],['√((2 / 3)(8 / 3)) = 4 / 3',raw`\sqrt{\frac23\cdot\frac83}=\frac43`],['ρ = 1',raw`\rho=1`],
  ['−0.5 × log₂(0.5) = 0.5',raw`-0.5\log_2(0.5)=0.5`],['H₂ = 0.5 + 0.5 + 0.5 = 1.5',raw`H_2=0.5+0.5+0.5=1.5`],
  ['(1² + 2²) / 2 = 2.5',raw`\frac{1^2+2^2}{2}=2.5`],['(0.5² + 1²) / 2 = 0.625',raw`\frac{0.5^2+1^2}{2}=0.625`],
  ['theta − target = [−1, −2]',raw`\boldsymbol\theta-\mathbf t=[-1,-2]`],['eta = 0.5',raw`\eta=0.5`],['xW + b',raw`\mathbf x\mathbf W+\mathbf b`],
  ['x²',raw`x^2`],['x³',raw`x^3`],['x′',raw`x'`],['x₂',raw`x_2`],['v̂',raw`\hat{\mathbf v}`],['∂f/∂x',raw`\frac{\partial f}{\partial x}`],['∂f/∂y',raw`\frac{\partial f}{\partial y}`],
  ['0 ≤ k ≤ n',raw`0\le k\le n`],['n! / (k!(n − k)!)',raw`\frac{n!}{k!(n-k)!}`],['√x',raw`\sqrt{x}`],['i²',raw`\mathrm{i}^2`],['9i²',raw`9\mathrm{i}^2`],
  ['m × n',raw`m\times n`],['n × p',raw`n\times p`],['m × p',raw`m\times p`],['n × m',raw`n\times m`],['p × q',raw`p\times q`],['mp × nq',raw`mp\times nq`],
  ['Aᵢⱼ',raw`A_{ij}`],['aᵢⱼB',raw`a_{ij}\mathbf B`],['aᵢⱼ',raw`a_{ij}`],['uᵢvⱼ',raw`u_i v_j`],['xᵢ',raw`x_i`],['yᵢ',raw`y_i`],
  ['2 × [4, 5, 6] = [8, 10, 12]',raw`2\times[4,5,6]=[8,10,12]`],['3 × [4, 5, 6] = [12, 15, 18]',raw`3\times[4,5,6]=[12,15,18]`],
  ['2 ≯ 3',raw`2\ngtr3`],['x ≥ 1',raw`x\ge1`],['Δf/Δx = 5',raw`\frac{\Delta f}{\Delta x}=5`],['Δx',raw`\Delta x`],['Δf',raw`\Delta f`],
  ['δᵢⱼ',raw`\delta_{ij}`],['φ(a)',raw`\varphi(a)`],['φ',raw`\varphi`],['ωᵢ',raw`\boldsymbol\omega_i`],['Ω⁺',raw`\Omega^+`],['E⊥',raw`E_\perp`],['Lₒ',raw`L_o`],
  ['W/(m²·sr)',raw`\mathrm{W}/(\mathrm{m}^2\!\cdot\!\mathrm{sr})`],['W/m²',raw`\mathrm{W}/\mathrm{m}^2`],['−log₂ p',raw`-\log_2 p`],['0 × log₂(0)',raw`0\times\log_2(0)`],
  ['1 × (−0.5) + 1 × (−0.5) = −1',raw`1\times(-0.5)+1\times(-0.5)=-1`],['g ∘ f',raw`g\circ f`],['∘',raw`\circ`],['×',raw`\times`],
  ['ℝ',raw`\mathbb R`],['ℚ',raw`\mathbb Q`],['ℤ',raw`\mathbb Z`],['ℕ',raw`\mathbb N`],['ℂ',raw`\mathbb C`],['π',raw`\pi`],['θ',raw`\theta`],['η',raw`\eta`],['σ',raw`\sigma`],['ρ',raw`\rho`],['μ',raw`\mu`],['∇',raw`\nabla`],['∞',raw`\infty`],
]);

for (const [text, tex] of extraMathPhrases) mathPhrases.set(text, tex);

const superscripts = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
function numericTex(value) {
  return value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g,s=>`^{${[...s].map(c=>superscripts[c]).join('')}}`)
    .replace(/−/g,'-').replace(/×/g,'\\times ').replace(/÷/g,'\\div ').replace(/≤/g,'\\le ').replace(/≥/g,'\\ge ').replace(/≠/g,'\\ne ').replace(/≈/g,'\\approx ')
    .replace(/([\d.]+)\s*\/\s*([\d.]+)/g,'\\frac{$1}{$2}');
}
const number = '[−-]?\\d+(?:\\.\\d+)?[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*';
const numeric = new RegExp(`(?<![\\p{L}\\p{N}_.])(?:√${number}(?:\\s*[=≈]\\s*${number})?|${number}(?:\\s*[+−×÷/=<>≤≥≠≈]\\s*${number})+|${number}[⁰¹²³⁴⁵⁶⁷⁸⁹]+)`, 'gu');
const phrases = [...mathPhrases].sort((a,b)=>b[0].length-a[0].length);
const codePhrases = ['product *= factor', '1n / 3n', 'n >= 0', 'n >= 1', '0 < x && x < 1', '!(NaN > 3)', 'NaN <= 3', 'x / Math.abs(x)', '1 / Infinity', 'Infinity − Infinity', 'favourable / total', 'sumSquares / count', 'jointProbability / probabilityB', 'value > 0', 'value − target[i]', 'logNormalizer − shifted[labels[i]]', 'i < 4', '<<', '>>', '<=', '>='];
const codePattern = /(?:\b(?:Math|Number|Array|JSON|Object|console)\.[A-Za-z]+(?:\([^()\n]*\))?|===|!==|&&|\|\||=>|\*\*)/g;
const mathCache = new Map();
function typeset(tex) {
  if (!mathCache.has(tex)) mathCache.set(tex,katex.renderToString(tex,{displayMode:false,output:'htmlAndMathml',throwOnError:true,strict:'error',trust:false,maxExpand:1000}));
  return `<span class="symbol-detail__inline-math">${mathCache.get(tex)}</span>`;
}

export function explanationTokens(value) {
  const text = String(value ?? '');
  const matches = [];
  for (const match of text.matchAll(codePattern)) matches.push({index:match.index,end:match.index+match[0].length,text:match[0],code:true,priority:2});
  for (const code of codePhrases) {
    let from=0,index;
    while((index=text.indexOf(code,from))!==-1){matches.push({index,end:index+code.length,text:code,code:true,priority:2});from=index+code.length;}
  }
  for (const [plain,tex] of phrases) {
    let from=0,index;
    while ((index=text.indexOf(plain,from))!==-1) {
      const before=text[index-1] || '',after=text[index+plain.length] || '';
      if (!( /[\p{L}\p{N}_]/u.test(plain[0]) && /[\p{L}\p{N}_]/u.test(before)) && !( /[\p{L}\p{N}_]/u.test(plain.at(-1)) && /[\p{L}\p{N}_]/u.test(after))) matches.push({index,end:index+plain.length,text:plain,tex,priority:1});
      from=index+plain.length;
    }
  }
  for (const match of text.matchAll(numeric)) {
    const tex=match[0].startsWith('√') ? numericTex(match[0].replace(new RegExp(`^√(${number})`),'\\sqrt{$1}')) : numericTex(match[0]);
    matches.push({index:match.index,end:match.index+match[0].length,text:match[0],tex,priority:0});
  }
  matches.sort((a,b)=>a.index-b.index || b.priority-a.priority || b.end-a.end);
  const tokens=[];let offset=0;
  for (const match of matches) {if(match.index<offset)continue;if(match.index>offset)tokens.push({text:text.slice(offset,match.index)});tokens.push(match);offset=match.end;}
  if(offset<text.length)tokens.push({text:text.slice(offset)});
  return tokens;
}

export function renderExplanation(value) {
  return explanationTokens(value).map(token=>token.code ? `<code class="symbol-detail__inline-code">${escape(token.text)}</code>` : token.tex ? typeset(token.tex) : escape(token.text)).join('');
}
