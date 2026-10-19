import React, { useId, useState } from 'react';
import { Button } from '../components/ui/button';
import { ExperimentFrame, RangeControl, Metric, SvgHandle } from './scene-ui.jsx';
import { derivativeState, integralState, correlationState, CORRELATION_PRESETS, MIN_GAP, MAX_RECTANGLES } from './calculus-statistics-model.mjs';

const A = 'var(--scene-a)';
const B = 'var(--scene-b)';
const C = 'var(--scene-c)';
const GRID = 'var(--scene-grid)';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = value => Math.round(value * 100) / 100;
const fmt = (value, digits = 3) => Math.abs(value) < 0.5 * 10 ** -digits ? '0' : Number(value.toFixed(digits)).toString();
const locale = language => language === 'zh' ? 'zh' : 'en';
const path = points => points.map((point, index) => `${index ? 'L' : 'M'}${point.join(' ')}`).join(' ');
const Metrics = ({ children }) => <div className="experiment-metrics">{children}</div>;

function Plot({ label, children }) {
  return <svg className="experiment-plot" viewBox="0 0 360 300" width="100%" role="group" aria-label={label}>
    <title>{label}</title>{children}
  </svg>;
}

const derivativeCopy = {
  en: {
    title: 'Bring a secant toward a tangent', description: 'On f(x) = x², drag either point horizontally. A finite gap gives an average rate; shrinking it reveals the local rate.',
    x: 'Base input x', gap: 'Gap magnitude |h|', left: 'From the left', right: 'From the right', halve: 'Halve the gap',
    base: 'Point P', nearby: 'Point Q', rise: 'Rise Δy', run: 'Run Δx', secant: 'Secant Δy / Δx', tangent: 'Exact derivative 2x', error: 'Secant − derivative',
    steps: ['Choose a point on the curve', 'Choose a nearby point', 'Measure rise over run', 'Let the gap approach zero'],
    captions: [
      'P = (x, x²). Changing x moves the point along the same parabola.',
      'Q = (x + h, (x + h)²). A negative h approaches P from the left; a positive h approaches from the right.',
      'The triangle is the actual change between P and Q: Δx = h and Δy = (x + h)² − x². Its secant slope is 2x + h.',
      'The dashed tangent has slope 2x. Halving |h| halves the secant error for x². The gap remains nonzero: the finite secant is still an approximation.',
    ],
    plot: 'Parabola, movable points, secant triangle, and limiting tangent', drag: 'Drag horizontally or use arrow keys', finite: 'finite secant', limit: 'limiting tangent',
  },
  zh: {
    title: '让割线逐渐靠近切线', description: '在 f(x) = x² 上，水平拖动任一点。有限间距给出平均变化率；缩小间距，观察局部变化率。',
    x: '基点横坐标 x', gap: '间距的绝对值 |h|', left: '从左侧靠近', right: '从右侧靠近', halve: '间距减半',
    base: '点 P', nearby: '点 Q', rise: '纵向变化 Δy', run: '横向变化 Δx', secant: '割线斜率 Δy / Δx', tangent: '精确导数 2x', error: '割线斜率 − 导数',
    steps: ['选择曲线上的一点', '选择附近的另一点', '测量纵向与横向变化之比', '让间距趋近于零'],
    captions: [
      'P = (x, x²)。改变 x，点始终沿同一条抛物线移动。',
      'Q = (x + h, (x + h)²)。h 为负时从左侧靠近 P，为正时从右侧靠近。',
      '三角形显示 P 到 Q 的实际变化：Δx = h，Δy = (x + h)² − x²。割线斜率为 2x + h。',
      '虚线切线的斜率为 2x。对于 x²，|h| 减半，割线误差也减半。间距仍不为零，因此有限割线依然只是近似。',
    ],
    plot: '抛物线、可移动点、割线三角形与极限切线', drag: '水平拖动或使用方向键', finite: '有限割线', limit: '极限切线',
  },
};

export function DerivativeExperiment({ language = 'en' }) {
  const t = derivativeCopy[locale(language)];
  const clipId = useId();
  const [x, setX] = useState(1);
  const [h, setH] = useState(0.8);
  const [step, setStep] = useState(0);
  const state = derivativeState(x, h);
  const px = value => 180 + value * (288 / 5.2);
  const py = value => 232 - (value + 0.7) * (184 / 7.4);
  const point = ([xx, yy]) => [px(xx), py(yy)];
  const p = point(state.base);
  const q = point(state.nearby);
  const curve = Array.from({ length: 105 }, (_, index) => {
    const xx = -2.6 + index * 5.2 / 104;
    return point([xx, xx * xx]);
  });
  const line = slope => path([-2.6, 2.6].map(xx => point([xx, state.base[1] + slope * (xx - x)])));
  const moveBase = value => setX(round(clamp(value, -1.5, 1.5)));
  const moveGap = value => {
    const bounded = round(clamp(value, -1, 1));
    setH(Math.abs(bounded) < MIN_GAP ? (bounded < 0 || (bounded === 0 && h < 0) ? -MIN_GAP : MIN_GAP) : bounded);
  };
  return <ExperimentFrame language={language} title={t.title} description={t.description} steps={t.steps} step={step} onStep={setStep}
    controls={<>
      <RangeControl label={t.x} value={x} min={-1.5} max={1.5} step={0.01} onChange={moveBase} display={fmt(x, 2)} />
      {step >= 1 && <>
        <RangeControl label={t.gap} value={Math.abs(h)} min={MIN_GAP} max={1} step="any" onChange={value => moveGap(Math.sign(h) * value)} display={fmt(Math.abs(h), 4)} />
        <div className="experiment-presets">
          <Button type="button" variant={h < 0 ? 'secondary' : 'outline'} size="sm" aria-pressed={h < 0} onClick={() => setH(-Math.abs(h))}>{t.left}</Button>
          <Button type="button" variant={h > 0 ? 'secondary' : 'outline'} size="sm" aria-pressed={h > 0} onClick={() => setH(Math.abs(h))}>{t.right}</Button>
          {step >= 3 && <Button type="button" variant="outline" size="sm" disabled={Math.abs(h) < 2 * MIN_GAP} onClick={() => setH(h / 2)}>{t.halve}</Button>}
        </div>
      </>}
    </>}
    readout={<Metrics>
      <Metric label={t.base} value={`(${fmt(x)}, ${fmt(state.base[1])})`} />
      {step >= 1 && <Metric label={t.nearby} value={`(${fmt(state.nearby[0])}, ${fmt(state.nearby[1])})`} />}
      {step >= 2 && <><Metric label={t.run} value={fmt(h, 4)} /><Metric label={t.rise} value={fmt(state.rise, 4)} /><Metric label={t.secant} value={fmt(state.secant, 4)} /></>}
      {step >= 3 && <><Metric label={t.tangent} value={fmt(state.derivative, 4)} /><Metric label={t.error} value={fmt(state.error, 4)} /></>}
    </Metrics>} caption={t.captions[step]}>
    <Plot label={`${t.plot}. ${t.steps[step]}. x = ${fmt(x)}, h = ${fmt(h, 4)}.`}>
      <defs><clipPath id={clipId}><rect x="36" y="48" width="288" height="184" /></clipPath></defs>
      <text x="24" y="29" fill="currentColor" fontSize="21">f(x) = x²</text>
      <g stroke={GRID} strokeWidth="1" aria-hidden="true">
        {[-2, -1, 0, 1, 2].map(value => <line key={`x${value}`} x1={px(value)} y1="48" x2={px(value)} y2="232" />)}
        {[0, 2, 4, 6].map(value => <line key={`y${value}`} x1="36" y1={py(value)} x2="324" y2={py(value)} />)}
      </g>
      <line x1="36" y1={py(0)} x2="332" y2={py(0)} stroke="currentColor" opacity="0.4" />
      <line x1={px(0)} y1="42" x2={px(0)} y2="233" stroke="currentColor" opacity="0.4" />
      {[-2, -1, 1, 2].map(value => <text key={value} x={px(value)} y="251" textAnchor="middle" fill="currentColor" fontSize="18">{value}</text>)}
      {[2, 4, 6].map(value => <text key={value} x="28" y={py(value) + 6} textAnchor="end" fill="currentColor" fontSize="18">{value}</text>)}
      <text x="334" y={py(0) + 6} fill="currentColor" fontSize="18">x</text>
      <g clipPath={`url(#${clipId})`}>
        <path d={path(curve)} stroke="currentColor" opacity="0.6" strokeWidth="2.5" fill="none" />
        {step >= 2 && <>
          <polygon points={`${p.join(',')} ${q[0]},${p[1]} ${q.join(',')}`} fill={B} fillOpacity="0.16" />
          <path d={`M${p.join(' ')} H${q[0]} V${q[1]}`} stroke={B} strokeWidth="2" strokeDasharray="4 3" fill="none" />
          <path d={line(state.secant)} stroke={B} strokeWidth="2.5" fill="none" />
        </>}
        {step >= 3 && <path d={line(state.derivative)} stroke={A} strokeWidth="3" strokeDasharray="7 5" fill="none" />}
      </g>
      <SvgHandle x={p[0]} y={p[1]} color={A} label={`${t.base}: x = ${fmt(x)}. ${t.drag}`} onMove={({ x: screenX }) => moveBase((screenX - 180) / (288 / 5.2))} onNudge={(dx, dy) => moveBase(x + (dx || -dy) * 0.05)} />
      <text x={clamp(p[0] - 14, 40, 318)} y={clamp(p[1] + 25, 62, 235)} textAnchor="end" fill={A} fontSize="20">P</text>
      {step >= 1 && <>
        <SvgHandle x={q[0]} y={q[1]} color={B} label={`${t.nearby}: h = ${fmt(h, 4)}. ${t.drag}`} onMove={({ x: screenX }) => moveGap((screenX - 180) / (288 / 5.2) - x)} onNudge={(dx, dy) => moveGap(h + (dx || -dy) * 0.05)} />
        <text x={clamp(q[0] + 13, 40, 319)} y={clamp(q[1] - 13, 45, 218)} fill={B} fontSize="20">Q</text>
      </>}
      {step === 2 && <text x="180" y="284" textAnchor="middle" fill={B} fontSize="19">Δy / Δx = {fmt(state.secant, 3)}</text>}
      {step >= 3 && <g>
        <line x1="28" y1="279" x2="52" y2="279" stroke={B} strokeWidth="2.5" /><text x="59" y="285" fill="currentColor" fontSize="18">{t.finite}</text>
        <line x1="191" y1="279" x2="215" y2="279" stroke={A} strokeWidth="2.5" strokeDasharray="5 3" /><text x="222" y="285" fill="currentColor" fontSize="18">{t.limit}</text>
      </g>}
    </Plot>
  </ExperimentFrame>;
}

const integralCopy = {
  en: {
    title: 'Build an integral from signed pieces', description: 'A new example, f(x) = x² − 1, crosses below zero. Drag a and b to choose what accumulates, including the direction.',
    a: 'Start a', b: 'End b', count: 'Number of rectangles N', rule: 'Rectangle rule', midpoint: 'Midpoint', left: 'Start of piece', prefix: 'Accumulate the first k pieces',
    refine: 'Double N', swap: 'Reverse bounds', width: 'Signed width Δx', piece: 'Selected piece f(xᵢ)Δx', running: 'Running sum', positive: 'Positive pieces', negative: 'Negative pieces', estimate: 'Rectangle sum', exact: 'Exact F(b) − F(a)', error: 'Estimate − exact',
    steps: ['Choose an oriented interval', 'Replace the curve with rectangles', 'Accumulate signed contributions', 'Refine and compare with the exact value'],
    captions: [
      'The shaded region is signed accumulation. For increasing bounds, above zero adds and below zero subtracts. Reversing the bounds reverses the sign.',
      'Each rectangle has signed width Δx = (b − a)/N. Sample f at the midpoint or the start of each oriented piece. For increasing bounds, these starts are left endpoints.',
      'Follow k along the interval. Every contribution is f(xᵢ)Δx; the running total can rise or fall. Color follows the sign of the contribution.',
      'F(x) = x³/3 − x is exact for this example. Double N manually: the recorded error approaches zero. A finite rectangle sum remains an estimate.',
    ],
    history: 'Recorded error', runningPlot: 'Running sum by piece', plot: 'Signed area, adjustable integration bounds, rectangles and accumulation', drag: 'Drag horizontally or use arrow keys', noWidth: 'a = b: no interval, so the integral is zero.',
  },
  zh: {
    title: '用带符号的小块构建积分', description: '新例子 f(x) = x² − 1 的一部分在零以下。拖动 a、b，选择累积区间及方向。',
    a: '起点 a', b: '终点 b', count: '矩形数量 N', rule: '矩形取样规则', midpoint: '中点', left: '小块起点', prefix: '累加前 k 个小块',
    refine: 'N 加倍', swap: '交换上下限', width: '带符号宽度 Δx', piece: '当前小块 f(xᵢ)Δx', running: '累积和', positive: '正贡献之和', negative: '负贡献之和', estimate: '矩形总和', exact: '精确值 F(b) − F(a)', error: '估计值 − 精确值',
    steps: ['选择有方向的区间', '用矩形近似曲线', '累加带符号的贡献', '细分并与精确值比较'],
    captions: [
      '阴影表示带符号的累积。上下限递增时，零以上相加、零以下相减；交换上下限，积分变号。',
      '每个矩形的带符号宽度为 Δx = (b − a)/N。高度在中点或每个有向小块的起点取样。上下限递增时，这些起点就是左端点。',
      '沿区间移动 k。每项贡献为 f(xᵢ)Δx，累积和可以上升或下降。颜色表示贡献的正负。',
      '本例的精确原函数为 F(x) = x³/3 − x。手动将 N 加倍，观察记录的误差趋近零。有限矩形之和仍是估计值。',
    ],
    history: '已记录的误差', runningPlot: '逐块累积和', plot: '带符号面积、可调积分上下限、矩形与累积过程', drag: '水平拖动或使用方向键', noWidth: 'a = b：区间宽度为零，积分也为零。',
  },
};

function ErrorHistory({ records, label }) {
  const values = records.map(record => record.error);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = Math.max(max - min, 0.0001);
  const px = count => 46 + Math.log2(count) / 6 * 268;
  const py = value => 255 + (max - value) / span * 23;
  return <g>
    <text x="24" y="238" fill="currentColor" fontSize="18">{label}</text>
    <line x1="39" y1={py(0)} x2="325" y2={py(0)} stroke="currentColor" opacity="0.45" strokeDasharray="4 3" />
    <text x="22" y={py(0) + 6} fill="currentColor" fontSize="18">0</text>
    <path d={path(records.map(record => [px(record.count), py(record.error)]))} fill="none" stroke={B} strokeWidth="2" />
    {records.map((record, index) => <circle key={index} cx={px(record.count)} cy={py(record.error)} r="4" fill={B} />)}
    {(records.length === 1 || px(records.at(-1).count) - px(records[0].count) >= 56) && <text x={px(records[0].count)} y="296" textAnchor="middle" fill="currentColor" fontSize="18">N={records[0].count}</text>}
    {records.length > 1 && <text x={px(records.at(-1).count)} y="296" textAnchor="middle" fill="currentColor" fontSize="18">{px(records.at(-1).count) - px(records[0].count) >= 56 ? records.at(-1).count : `N=${records.at(-1).count}`}</text>}
  </g>;
}

export function IntegralExperiment({ language = 'en' }) {
  const t = integralCopy[locale(language)];
  const [a, setA] = useState(-1);
  const [b, setB] = useState(2);
  const [count, setCount] = useState(4);
  const [method, setMethod] = useState('midpoint');
  const [prefix, setPrefix] = useState(4);
  const [history, setHistory] = useState([4]);
  const [step, setStep] = useState(0);
  const state = integralState(a, b, count, method);
  const k = Math.min(prefix, count);
  const current = state.rectangles[k - 1];
  const px = value => 180 + value * (292 / 4.4);
  const py = value => 185 - (value + 1.5) * (137 / 5);
  const point = ([x, y]) => [px(x), py(y)];
  const curve = Array.from({ length: 89 }, (_, index) => {
    const x = -2.2 + index * 4.4 / 88;
    return point([x, x * x - 1]);
  });
  const updateBounds = (which, value) => {
    (which === 'a' ? setA : setB)(round(clamp(value, -2, 2)));
    setHistory([count]);
  };
  const updateCount = value => { setCount(value); setPrefix(value); setHistory([value]); };
  const refine = () => {
    const next = Math.min(MAX_RECTANGLES, count * 2);
    setCount(next); setPrefix(next); setHistory(previous => [...previous, next].slice(-7));
  };
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const cuts = [low, ...[-1, 1].filter(value => value > low && value < high), high];
  const exactAreas = cuts.slice(0, -1).map((start, index) => {
    const end = cuts[index + 1];
    const samples = Array.from({ length: 25 }, (_, i) => {
      const x = start + (end - start) * i / 24;
      return point([x, x * x - 1]);
    });
    const positive = (((start + end) / 2) ** 2 - 1) * state.direction >= 0;
    return <path key={index} d={`${path([point([start, 0]), ...samples, point([end, 0])])} Z`} fill={positive ? A : C} fillOpacity={step === 0 ? 0.2 : 0.07} />;
  });
  const prefixRects = state.rectangles.slice(0, k);
  const positive = prefixRects.reduce((sum, item) => sum + Math.max(0, item.contribution), 0);
  const negative = prefixRects.reduce((sum, item) => sum + Math.min(0, item.contribution), 0);
  const sums = [0, ...state.rectangles.map(rectangle => rectangle.cumulative)];
  const sumMin = Math.min(...sums);
  const sumMax = Math.max(...sums);
  const sumSpan = Math.max(sumMax - sumMin, 0.01);
  const sumX = index => 43 + index / count * 278;
  const sumY = value => 257 + (sumMax - value) / sumSpan * 23;
  return <ExperimentFrame language={language} title={t.title} description={t.description} steps={t.steps} step={step} onStep={setStep}
    controls={<>
      <RangeControl label={t.a} value={a} min={-2} max={2} step={0.01} onChange={value => updateBounds('a', value)} display={fmt(a, 2)} />
      <RangeControl label={t.b} value={b} min={-2} max={2} step={0.01} onChange={value => updateBounds('b', value)} display={fmt(b, 2)} />
      {step >= 1 && <RangeControl label={t.count} value={count} min={1} max={MAX_RECTANGLES} onChange={updateCount} />}
      {step === 2 && <RangeControl label={t.prefix} value={k} min={1} max={count} onChange={setPrefix} />}
      <div className="experiment-presets">
        <Button type="button" variant="outline" size="sm" onClick={() => { setA(b); setB(a); setHistory([count]); }}>{t.swap}</Button>
        {step >= 1 && ['midpoint', 'left'].map(rule => <Button key={rule} type="button" variant={method === rule ? 'secondary' : 'outline'} size="sm" aria-pressed={method === rule} onClick={() => { setMethod(rule); setHistory([count]); }}>{t[rule]}</Button>)}
        {step >= 3 && <Button type="button" variant="outline" size="sm" disabled={count > MAX_RECTANGLES / 2} onClick={refine}>{t.refine}</Button>}
      </div>
    </>}
    readout={<>
      <Metrics>
        {step >= 1 && <Metric label={t.width} value={fmt(state.width, 4)} />}
        {step === 2 && <><Metric label={t.piece} value={`${fmt(current.height)} × ${fmt(state.width)} = ${fmt(current.contribution, 4)}`} /><Metric label={t.positive} value={`+${fmt(positive, 4)}`} /><Metric label={t.negative} value={fmt(negative, 4)} /><Metric label={t.running} value={fmt(current.cumulative, 4)} /></>}
        {step >= 3 && <><Metric label={t.estimate} value={fmt(state.sum, 5)} /><Metric label={t.exact} value={fmt(state.exact, 5)} /><Metric label={t.error} value={fmt(state.error, 5)} /></>}
      </Metrics>
      {a === b && <p>{t.noWidth}</p>}
    </>} caption={t.captions[step]}>
    <Plot label={`${t.plot}. ${t.steps[step]}. a = ${fmt(a)}, b = ${fmt(b)}, N = ${count}.`}>
      <text x="24" y="28" fill="currentColor" fontSize="21">f(x) = x² − 1</text>
      <g stroke={GRID} aria-hidden="true">
        {[-2, -1, 0, 1, 2].map(value => <line key={`x${value}`} x1={px(value)} y1="48" x2={px(value)} y2="185" />)}
        {[-1, 0, 1, 2, 3].map(value => <line key={`y${value}`} x1="34" y1={py(value)} x2="326" y2={py(value)} />)}
      </g>
      {exactAreas}
      {step >= 1 && state.rectangles.map((rectangle, index) => <rect key={index} x={Math.min(px(rectangle.from), px(rectangle.to))} y={Math.min(py(0), py(rectangle.height))} width={Math.abs(px(rectangle.to) - px(rectangle.from))} height={Math.abs(py(rectangle.height) - py(0))} fill={rectangle.contribution >= 0 ? A : C} fillOpacity={step === 2 && index >= k ? 0.06 : 0.23} stroke={rectangle.contribution >= 0 ? A : C} strokeOpacity={step === 2 && index >= k ? 0.2 : 0.7} strokeWidth={count > 24 ? 0.5 : 1} />)}
      <line x1="34" y1={py(0)} x2="331" y2={py(0)} stroke="currentColor" opacity="0.6" />
      <line x1={px(0)} y1="44" x2={px(0)} y2="185" stroke="currentColor" opacity="0.4" />
      <path d={path(curve)} stroke="currentColor" strokeWidth="2.2" fill="none" />
      {[-2, -1, 1, 2].map(value => <text key={value} x={px(value)} y={py(0) + 24} textAnchor="middle" fill="currentColor" fontSize="18">{value}</text>)}
      <text x="28" y={py(3) + 6} textAnchor="end" fill="currentColor" fontSize="18">3</text>
      <text x="335" y={py(0) + 6} fill="currentColor" fontSize="18">x</text>
      <SvgHandle x={px(a)} y={py(0)} color={A} label={`${t.a}: ${fmt(a)}. ${t.drag}`} onMove={({ x }) => updateBounds('a', (x - 180) / (292 / 4.4))} onNudge={(dx, dy) => updateBounds('a', a + (dx || -dy) * 0.05)} />
      <SvgHandle x={px(b)} y={py(0)} color={B} label={`${t.b}: ${fmt(b)}. ${t.drag}`} onMove={({ x }) => updateBounds('b', (x - 180) / (292 / 4.4))} onNudge={(dx, dy) => updateBounds('b', b + (dx || -dy) * 0.05)} />
      {step === 2 && <circle cx={px(current.sample)} cy={py(current.height)} r="4" fill={current.contribution >= 0 ? A : C} stroke="var(--card)" strokeWidth="1.5" />}
      <line x1={px(a)} y1="191" x2={px(b)} y2="191" stroke={B} strokeWidth="2" />
      {a !== b && <path d={`M${px(b) - state.direction * 7} 186 L${px(b)} 191 L${px(b) - state.direction * 7} 196`} stroke={B} strokeWidth="2" fill="none" />}
      <text x="180" y="214" textAnchor="middle" fill="currentColor" fontSize="18">a = {fmt(a, 2)} → b = {fmt(b, 2)}</text>
      {step === 2 && <g>
        <text x="24" y="238" fill="currentColor" fontSize="18">{t.runningPlot}</text>
        <line x1="40" y1={sumY(0)} x2="324" y2={sumY(0)} stroke="currentColor" opacity="0.35" strokeDasharray="4 3" />
        <path d={path(sums.map((sum, index) => [sumX(index), sumY(sum)]))} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
        <path d={path(sums.slice(0, k + 1).map((sum, index) => [sumX(index), sumY(sum)]))} fill="none" stroke={B} strokeWidth="2.5" />
        <circle cx={sumX(k)} cy={sumY(current.cumulative)} r="5" fill={B} />
        <text x="324" y="296" textAnchor="end" fill="currentColor" fontSize="18">k = {k} / {count}</text>
      </g>}
      {step >= 3 && <ErrorHistory records={history.map(n => integralState(a, b, n, method))} label={t.history} />}
    </Plot>
  </ExperimentFrame>;
}

const correlationCopy = {
  en: {
    title: 'See what makes correlation change', description: 'Drag the six paired observations. Center them, inspect their signed products, then divide out their scales.',
    selected: 'Selected point', x: 'Selected x', y: 'Selected y', positive: 'Positive line', negative: 'Negative line', curved: 'Curved, ρ = 0', outlier: 'One outlier', constant: 'Constant x',
    means: 'Means (x̄, ȳ)', delta: 'Selected (x − x̄, y − ȳ)', product: 'Selected signed product', covariance: 'Population covariance', scales: 'Standard deviations (σₓ, σᵧ)', rho: 'Correlation ρ', undefined: 'Undefined', fit: 'Show best-fit line',
    steps: ['Move the paired observations', 'Center both coordinates', 'Add signed deviation products', 'Normalize by both standard deviations'],
    captions: [
      'Each dot is one paired observation (x, y). Try the outlier, then move it back toward the other points.',
      'Dashed lines mark x̄ and ȳ. The selected point is measured relative to these means, which move when the data changes.',
      'The selected rectangle has signed area (x − x̄)(y − ȳ). Same-sign deviations add; opposite-sign deviations subtract. The six bars show every contribution.',
      'ρ = covariance / (σₓσᵧ). It lies between −1 and 1 when both axes vary. The curved preset has dependence with zero linear correlation. Correlation does not establish causation.',
    ],
    undefinedX: 'x is constant, so σₓ = 0 and correlation is undefined.', undefinedY: 'y is constant, so σᵧ = 0 and correlation is undefined.', undefinedBoth: 'Both axes are constant. Correlation is undefined.',
    products: 'Signed products', plot: 'Movable scatter plot, mean lines, signed covariance rectangle and correlation scale', drag: 'Drag or use arrow keys',
  },
  zh: {
    title: '看清相关系数为何变化', description: '拖动六组配对观测值。先中心化，再观察带符号的乘积，最后除以两个尺度。',
    selected: '选中的点', x: '选中点的 x', y: '选中点的 y', positive: '正斜率直线', negative: '负斜率直线', curved: '曲线，ρ = 0', outlier: '一个离群点', constant: 'x 为常数',
    means: '均值 (x̄, ȳ)', delta: '选中点偏差 (x − x̄, y − ȳ)', product: '选中点的带符号乘积', covariance: '总体协方差', scales: '标准差 (σₓ, σᵧ)', rho: '相关系数 ρ', undefined: '未定义', fit: '显示最佳拟合直线',
    steps: ['移动配对的观测值', '将两个坐标中心化', '累加带符号的偏差乘积', '除以两个标准差'],
    captions: [
      '每个点是一组配对观测值 (x, y)。试用离群点预设，再将它移回其他点附近。',
      '虚线表示 x̄ 和 ȳ。选中点相对于这两个均值测量；数据变化时，均值也会移动。',
      '选中矩形的带符号面积为 (x − x̄)(y − ȳ)。同号偏差相加、异号偏差相减；六根柱表示每一项贡献。',
      'ρ = 协方差 / (σₓσᵧ)。两个轴都有变化时，它在 −1 与 1 之间。曲线预设存在依赖关系，但线性相关为零。相关性不代表因果关系。',
    ],
    undefinedX: 'x 为常数，因此 σₓ = 0，相关系数未定义。', undefinedY: 'y 为常数，因此 σᵧ = 0，相关系数未定义。', undefinedBoth: '两个轴均为常数，相关系数未定义。',
    products: '带符号乘积', plot: '可移动散点图、均值线、带符号协方差矩形与相关系数刻度', drag: '拖动或使用方向键',
  },
};

export function CorrelationExperiment({ language = 'en' }) {
  const t = correlationCopy[locale(language)];
  const clipId = useId();
  const [points, setPoints] = useState(() => CORRELATION_PRESETS.positive.map(point => [...point]));
  const [selected, setSelected] = useState(5);
  const [step, setStep] = useState(0);
  const [showFit, setShowFit] = useState(false);
  const state = correlationState(points);
  const selectedPoint = points[selected];
  const deviation = state.deviations[selected];
  const px = x => 45 + x / 7 * 277;
  const py = y => 208 - y / 7 * 164;
  const movePoint = (index, x, y) => {
    setSelected(index);
    setPoints(previous => previous.map((point, i) => i === index ? [round(clamp(x, 0, 7)), round(clamp(y, 0, 7))] : point));
  };
  const productMax = Math.max(0.01, ...state.deviations.map(item => Math.abs(item.product)));
  const undefinedMessage = state.undefinedAxis === 'both' ? t.undefinedBoth : state.undefinedAxis === 'x' ? t.undefinedX : t.undefinedY;
  return <ExperimentFrame language={language} title={t.title} description={t.description} steps={t.steps} step={step} onStep={setStep}
    controls={<>
      <RangeControl label={t.selected} value={selected + 1} min={1} max={points.length} onChange={value => setSelected(value - 1)} display={`P${selected + 1}`} />
      <RangeControl label={t.x} value={selectedPoint[0]} min={0} max={7} step={0.01} onChange={value => movePoint(selected, value, selectedPoint[1])} display={fmt(selectedPoint[0], 2)} />
      <RangeControl label={t.y} value={selectedPoint[1]} min={0} max={7} step={0.01} onChange={value => movePoint(selected, selectedPoint[0], value)} display={fmt(selectedPoint[1], 2)} />
      <div className="experiment-presets">
        {Object.entries(CORRELATION_PRESETS).map(([name, data]) => <Button key={name} type="button" variant="outline" size="sm" onClick={() => { setPoints(data.map(point => [...point])); setSelected(5); }}>{t[name]}</Button>)}
        {step >= 3 && <Button type="button" variant={showFit ? 'secondary' : 'outline'} size="sm" aria-pressed={showFit} disabled={state.slope === null} onClick={() => setShowFit(value => !value)}>{t.fit}</Button>}
      </div>
    </>}
    readout={<>
      <Metrics>
        <Metric label={`P${selected + 1}`} value={`(${fmt(selectedPoint[0])}, ${fmt(selectedPoint[1])})`} />
        {step >= 1 && <><Metric label={t.means} value={`(${fmt(state.meanX)}, ${fmt(state.meanY)})`} /><Metric label={t.delta} value={`(${fmt(deviation.dx)}, ${fmt(deviation.dy)})`} /></>}
        {step >= 2 && <><Metric label={t.product} value={`${fmt(deviation.dx)} × ${fmt(deviation.dy)} = ${fmt(deviation.product)}`} /><Metric label={t.covariance} value={`${fmt(state.sumProducts)} / ${state.count} = ${fmt(state.covariance)}`} /></>}
        {step >= 3 && <><Metric label={t.scales} value={`(${fmt(state.sigmaX)}, ${fmt(state.sigmaY)})`} /><Metric label={t.rho} value={state.correlation === null ? t.undefined : fmt(state.correlation, 4)} /></>}
      </Metrics>
      {step >= 3 && state.correlation === null && <p>{undefinedMessage}</p>}
    </>} caption={t.captions[step]}>
    <Plot label={`${t.plot}. ${t.steps[step]}. ${t.selected}: P${selected + 1}.`}>
      <defs><clipPath id={clipId}><rect x="45" y="44" width="277" height="164" /></clipPath></defs>
      <text x="24" y="28" fill="currentColor" fontSize="21">{step >= 3 ? `ρ = ${state.correlation === null ? t.undefined : fmt(state.correlation, 4)}` : `P${selected + 1} = (${fmt(selectedPoint[0], 2)}, ${fmt(selectedPoint[1], 2)})`}</text>
      <g stroke={GRID} aria-hidden="true">
        {[0, 2, 4, 6].map(value => <g key={value}><line x1={px(value)} y1="44" x2={px(value)} y2="208" /><line x1="45" y1={py(value)} x2="322" y2={py(value)} /></g>)}
      </g>
      <line x1="45" y1="208" x2="332" y2="208" stroke="currentColor" opacity="0.5" />
      <line x1="45" y1="36" x2="45" y2="208" stroke="currentColor" opacity="0.5" />
      {[0, 2, 4, 6].map(value => <g key={value}><text x={px(value)} y="231" textAnchor="middle" fill="currentColor" fontSize="18">{value}</text>{value > 0 && <text x="33" y={py(value) + 6} textAnchor="end" fill="currentColor" fontSize="18">{value}</text>}</g>)}
      <text x="335" y="215" fill="currentColor" fontSize="18">x</text><text x="31" y="42" fill="currentColor" fontSize="18">y</text>
      {step >= 2 && <rect x={Math.min(px(state.meanX), px(selectedPoint[0]))} y={Math.min(py(state.meanY), py(selectedPoint[1]))} width={Math.abs(px(selectedPoint[0]) - px(state.meanX))} height={Math.abs(py(selectedPoint[1]) - py(state.meanY))} fill={deviation.product >= 0 ? A : C} fillOpacity="0.2" stroke={deviation.product >= 0 ? A : C} strokeWidth="1.5" />}
      {step >= 1 && <g stroke={B} strokeWidth="1.7" strokeDasharray="5 4">
        <line x1={px(state.meanX)} y1="44" x2={px(state.meanX)} y2="208" /><line x1="45" y1={py(state.meanY)} x2="322" y2={py(state.meanY)} />
      </g>}
      {step >= 1 && <g><circle cx={px(state.meanX)} cy={py(state.meanY)} r="3" fill={B} /><text x={clamp(px(state.meanX) + 9, 55, 300)} y="58" fill={B} fontSize="18">x̄</text><text x="306" y={clamp(py(state.meanY) - 8, 66, 196)} fill={B} fontSize="18">ȳ</text></g>}
      {step >= 3 && showFit && state.slope !== null && <path d={path([0, 7].map(x => [px(x), py(state.intercept + state.slope * x)]))} clipPath={`url(#${clipId})`} fill="none" stroke={B} strokeWidth="2.5" />}
      {points.map(([x, y], index) => <SvgHandle key={index} x={px(x)} y={py(y)} color={index === selected ? B : A} label={`P${index + 1}: (${fmt(x)}, ${fmt(y)}). ${t.drag}`} onMove={({ x: screenX, y: screenY }) => movePoint(index, (screenX - 45) / 277 * 7, (208 - screenY) / 164 * 7)} onNudge={(dx, dy) => movePoint(index, x + dx * 0.1, y - dy * 0.1)} />)}
      {step === 2 && <g>
        <text x="24" y="255" fill="currentColor" fontSize="18">{t.products}</text>
        <line x1="179" y1="271" x2="329" y2="271" stroke="currentColor" opacity="0.35" />
        {state.deviations.map((item, index) => <g key={index}>
          <rect x={182 + index * 24} y={item.product >= 0 ? 271 - item.product / productMax * 16 : 271} width="15" height={Math.abs(item.product) / productMax * 16} fill={item.product >= 0 ? A : C} fillOpacity={index === selected ? 1 : 0.55} />
          <text x={189.5 + index * 24} y="295" textAnchor="middle" fill="currentColor" fontSize="18">{index + 1}</text>
        </g>)}
      </g>}
      {step >= 3 && <g>
        <line x1="56" y1="269" x2="310" y2="269" stroke={GRID} strokeWidth="8" strokeLinecap="round" />
        {[-1, 0, 1].map(value => <g key={value}><line x1={183 + value * 127} y1="261" x2={183 + value * 127} y2="277" stroke="currentColor" opacity="0.5" /><text x={183 + value * 127} y="295" textAnchor="middle" fill="currentColor" fontSize="18">{value}</text></g>)}
        {state.correlation !== null && <circle cx={183 + state.correlation * 127} cy="269" r="7" fill={B} />}
        {state.correlation === null && <text x="183" y="258" textAnchor="middle" fill={B} fontSize="18">{t.undefined}</text>}
      </g>}
    </Plot>
  </ExperimentFrame>;
}

export const calculusStatisticsExperiments = {
  derivative: { title: { en: derivativeCopy.en.title, zh: derivativeCopy.zh.title }, Component: DerivativeExperiment },
  integral: { title: { en: integralCopy.en.title, zh: integralCopy.zh.title }, Component: IntegralExperiment },
  correlation: { title: { en: correlationCopy.en.title, zh: correlationCopy.zh.title }, Component: CorrelationExperiment },
};
