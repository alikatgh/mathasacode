import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { ExperimentFrame, RangeControl, Metric, SvgHandle } from './scene-ui.jsx';
import {
  INITIAL_DOT_ANGLE, rotateDotVector, dotAngleForPoint, normalizationState, matrixTransformState, unitCircleState,
} from './geometry-model.mjs';

const A = 'var(--scene-a)';
const B = 'var(--scene-b)';
const GRID = 'var(--scene-grid)';
const fmt = (value, places = 3) => Math.abs(value) < 0.5 * 10 ** -places ? '0' : Number(value.toFixed(places)).toString();
const pair = value => `[${value.map(number => fmt(number)).join(', ')}]`;
const languageOf = language => language === 'zh' ? 'zh' : 'en';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function Arrow({ from, to, color = A, width = 3, opacity = 1 }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return null;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(9, length * 0.4);
  const base = [to[0] - ux * head, to[1] - uy * head];
  return <g opacity={opacity}>
    <line x1={from[0]} y1={from[1]} x2={base[0]} y2={base[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
    <polygon points={`${to.join(',')} ${base[0] - uy * head * 0.45},${base[1] + ux * head * 0.45} ${base[0] + uy * head * 0.45},${base[1] - ux * head * 0.45}`} fill={color} />
  </g>;
}

function Plot({ label, children, interactive = false }) {
  return <svg className="experiment-plot" viewBox="0 0 360 260" width="100%" role={interactive ? 'group' : 'img'} aria-label={label} style={{ fontFamily: 'inherit', overflow: 'visible' }}>
    <title>{label}</title>
    {children}
  </svg>;
}

function Grid({ origin, scale, xs, ys, xMin, xMax, yMin, yMax }) {
  return <g stroke={GRID} strokeWidth="1" aria-hidden="true">
    {xs.map(x => <line key={`x${x}`} x1={origin[0] + x * scale} y1={origin[1] - yMin * scale} x2={origin[0] + x * scale} y2={origin[1] - yMax * scale} />)}
    {ys.map(y => <line key={`y${y}`} x1={origin[0] + xMin * scale} y1={origin[1] - y * scale} x2={origin[0] + xMax * scale} y2={origin[1] - y * scale} />)}
  </g>;
}

function Metrics({ children }) {
  return <div className="experiment-metrics">{children}</div>;
}

const dotCopy = {
  en: {
    title: 'A dot product is a signed projection',
    description: 'Drag b around the circle. The projection and the cosine curve describe the same dot product.',
    handle: 'Rotate vector b. Drag the point or use the arrow keys.',
    hint: 'Drag the ring on b, or focus it and use arrow keys. The radius stays 5.',
    angle: 'Angle from a to b', presets: ['Aligned', 'Perpendicular', 'Opposite'],
    steps: ['Fix the reference vector a', 'Rotate the second vector b', 'Drop a perpendicular onto a', 'Weight the signed projection'],
    captions: [
      'a = [1, 2] sets the reference direction. Its length is √5.',
      'b always has length 5. Its direction changes while a stays fixed.',
      'p lies on the line through a. The dashed drop is perpendicular to that line.',
      'a · b = |a| × signed length of p. Projection in the opposite direction gives a negative dot product.',
    ],
    vectorA: 'Reference a', vectorB: 'Rotating b', projection: 'Projection p', signed: 'Signed projection length', dot: 'a · b',
    positive: 'Positive: b points partly along a.', zero: 'Zero: b is perpendicular to a.', negative: 'Negative: b points partly against a.',
    plot: 'Reference vector a, rotating vector b, and the perpendicular projection p',
  },
  zh: {
    title: '点积是带符号的投影',
    description: '沿圆拖动 b。几何投影与余弦曲线表示同一个点积。',
    handle: '旋转向量 b。拖动圆点或使用方向键。',
    hint: '拖动 b 上的圆环，也可以聚焦圆环后使用方向键。半径始终为 5。',
    angle: '从 a 到 b 的夹角', presets: ['同向', '垂直', '反向'],
    steps: ['固定参考向量 a', '旋转第二个向量 b', '向 a 所在直线作垂线', '计算带符号的点积'],
    captions: [
      'a = [1, 2] 确定参考方向，长度为 √5。',
      'b 的长度始终为 5。改变方向时，a 保持不变。',
      'p 位于 a 所在的直线上。虚线与这条直线垂直。',
      'a · b = |a| × p 的带符号长度。投影与 a 反向时，点积为负。',
    ],
    vectorA: '参考向量 a', vectorB: '旋转向量 b', projection: '投影 p', signed: '带符号的投影长度', dot: 'a · b',
    positive: '正值：b 有沿 a 方向的分量。', zero: '零：b 与 a 垂直。', negative: '负值：b 有与 a 反向的分量。',
    plot: '参考向量 a、旋转向量 b 及其垂直投影 p',
  },
};

export function DotProjection({ language = 'en' }) {
  const t = dotCopy[languageOf(language)];
  const [degrees, setDegrees] = useState(INITIAL_DOT_ANGLE);
  const [step, setStep] = useState(0);
  const state = rotateDotVector(degrees);
  const origin = [180, 140];
  const point = ([x, y]) => [origin[0] + x * 18, origin[1] - y * 18];
  const a = point(state.a);
  const b = point(state.b);
  const p = point(state.projection);
  const axisStart = point([-2.6, -5.2]);
  const axisEnd = point([2.6, 5.2]);
  const sign = Math.abs(state.dot) < 1e-9 ? t.zero : state.dot > 0 ? t.positive : t.negative;
  const moveVector = ({ x, y }) => {
    const angle = dotAngleForPoint([(x - origin[0]) / 18, (origin[1] - y) / 18]);
    if (angle === null) return;
    setDegrees(Math.round(angle * 10) / 10);
    setStep(value => Math.max(1, value));
  };
  const curveX = angle => 30 + (angle + 180) * 300 / 360;
  const curveY = angle => 54 - 30 * Math.cos(angle * Math.PI / 180);
  const cosinePath = Array.from({ length: 121 }, (_, i) => {
    const angle = -180 + i * 3;
    return `${i ? 'L' : 'M'}${curveX(angle)},${curveY(angle)}`;
  }).join(' ');
  // A small right-angle corner uses the actual perpendicular and axis directions.
  const axisUnit = state.a.map(value => value / state.axisLength);
  const residualLength = Math.hypot(...state.residual);
  const residualUnit = residualLength > 1e-8 ? state.residual.map(value => value / residualLength) : [0, 0];
  const corner = [
    state.projection.map((value, i) => value - axisUnit[i] * 0.35),
    state.projection.map((value, i) => value - axisUnit[i] * 0.35 + residualUnit[i] * 0.35),
    state.projection.map((value, i) => value + residualUnit[i] * 0.35),
  ].map(point);
  return <ExperimentFrame language={language} title={t.title} description={t.description}
    steps={t.steps} step={step} onStep={setStep}
    controls={<>
      <RangeControl label={t.angle} value={degrees} min={-180} max={180} step={0.1} onChange={setDegrees} display={`${fmt(degrees, 1)}°`} />
      <div className="experiment-presets">{[0, 90, 180].map((value, i) => <Button key={value} type="button" variant="outline" size="sm" onClick={() => setDegrees(value)}>{t.presets[i]}</Button>)}</div>
      <p className="experiment-drag-hint">{t.hint}</p>
    </>}
    readout={<>
      <Metrics><Metric label={t.vectorA} value={pair(state.a)} />{step >= 1 && <Metric label={t.vectorB} value={pair(state.b)} />}{step >= 2 && <Metric label={t.projection} value={pair(state.projection)} />}{step >= 3 && <><Metric label={t.signed} value={fmt(state.signedLength)} /><Metric label={t.dot} value={fmt(state.dot)} /></>}</Metrics>
      {step >= 3 && <p>{sign}</p>}
      <p className="experiment-formula">a · b = |a| |b| cos θ<br />≈ √5 × 5 × {fmt(state.cosine)} ≈ <strong>{fmt(state.dot)}</strong></p>
    </>} caption={t.captions[step]}>
    <div className="experiment-plot-stack">
    <Plot interactive label={`${t.plot}. ${t.steps[step]}. ${step >= 3 ? `${t.dot} = ${fmt(state.dot)}. ${sign}` : ''}`}>
      <Grid origin={origin} scale={18} xs={[-4, -2, 0, 2, 4]} ys={[-4, -2, 0, 2, 4, 6]} xMin={-7} xMax={7} yMin={-5} yMax={6} />
      <circle cx={origin[0]} cy={origin[1]} r="90" stroke={GRID} fill="none" strokeDasharray="2 5" />
      <line x1={axisStart[0]} y1={axisStart[1]} x2={axisEnd[0]} y2={axisEnd[1]} stroke="currentColor" opacity="0.25" strokeDasharray="4 5" />
      {step >= 2 && <>
        <line x1={b[0]} y1={b[1]} x2={p[0]} y2={p[1]} stroke={B} strokeWidth="2" strokeDasharray="5 5" />
        {residualLength > 0.5 && Math.abs(state.signedLength) > 0.4 && <polyline points={corner.map(item => item.join(',')).join(' ')} stroke={B} strokeWidth="1.5" fill="none" />}
        <Arrow from={origin} to={p} color={B} width={step >= 3 ? 8 : 5} opacity={0.4} />
        <circle cx={p[0]} cy={p[1]} r="4" fill={B} />
        <text x={clamp(p[0] - 15, 25, 335)} y={clamp(p[1] - 10, 24, 239)} textAnchor="end" fill={B} fontSize="18">p</text>
      </>}
      <Arrow from={origin} to={a} color={A} />
      <text x={a[0] + 12} y={a[1] + 10} fill={A} fontSize="20">a</text>
      <Arrow from={origin} to={b} color={B} opacity={step === 0 ? 0.4 : 1} />
      <text x={clamp(b[0] + 16, 25, 335)} y={clamp(b[1] + 2, 24, 243)} fill={B} fontSize="20">b</text>
      <SvgHandle x={b[0]} y={b[1]} label={`${t.handle} θ = ${fmt(degrees, 1)}°`} color={B} onMove={moveVector}
        onNudge={(dx, dy) => { setDegrees(value => clamp(value + dx - dy, -180, 180)); setStep(value => Math.max(1, value)); }} />
      <circle cx={origin[0]} cy={origin[1]} r="3" fill="currentColor" />
      <text x="159" y="161" fill="currentColor" fontSize="18">0</text>
      {step >= 3 && <text x="24" y="32" fill="currentColor" fontSize="21">a · b = {fmt(state.dot)}</text>}
    </Plot>
    <svg viewBox="0 0 360 120" role="img" aria-label={`${t.dot} = √5 × 5 × cos θ; θ = ${fmt(degrees, 1)}°; ${t.dot} = ${fmt(state.dot)}`}>
      <line x1="30" y1="54" x2="330" y2="54" stroke={GRID} />
      <line x1="180" y1="20" x2="180" y2="88" stroke={GRID} />
      <path d={cosinePath} fill="none" stroke={B} strokeWidth="2.5" />
      <line x1={curveX(degrees)} y1="54" x2={curveX(degrees)} y2={curveY(degrees)} stroke={B} strokeDasharray="3 3" />
      <circle cx={curveX(degrees)} cy={curveY(degrees)} r="5" fill={B} stroke="var(--card)" strokeWidth="1.5" />
      <g fill="currentColor" fontSize="18"><text x="30" y="110" textAnchor="middle">−180°</text><text x="180" y="110" textAnchor="middle">0°</text><text x="330" y="110" textAnchor="middle">180°</text><text x="27" y="18">a · b</text><text x="335" y="60">θ</text></g>
    </svg>
    </div>
  </ExperimentFrame>;
}

const normalizationCopy = {
  en: {
    title: 'Change the length. Keep the direction.', description: 'Normalize v = [0, 4, −3] by dividing every coordinate by its length.',
    scale: 'Scale the original vector', steps: ['Start with the vector', 'Measure its length', 'Divide by the same length', 'Compare the unit direction'],
    captions: [
      'This is the last two coordinates of [0, 4, −3]. The first coordinate stays zero, so this 2D view preserves the full length.',
      'The horizontal and vertical legs give |v| = √(0² + y² + z²). At scale 1, the length is 5.',
      'Divide each coordinate by |v|. This scales the arrow without turning it.',
      'The unit arrow has length 1 at every scale. Both arrows share the same direction and the same plot scale.',
    ],
    vector: 'v', length: '|v|', unit: 'v / |v|', unitLength: 'Unit length', plot: 'Vector v and its unit direction in the y z plane',
  },
  zh: {
    title: '改变长度，保持方向', description: '将 v = [0, 4, −3] 的每个坐标除以向量长度，得到单位向量。',
    scale: '缩放原向量', steps: ['观察原向量', '测量向量长度', '每个坐标除以长度', '比较单位方向'],
    captions: [
      '图中显示 [0, 4, −3] 的后两个坐标。第一个坐标始终为零，因此二维图保留了完整长度。',
      '水平和竖直直角边给出 |v| = √(0² + y² + z²)。缩放倍数为 1 时，长度为 5。',
      '将每个坐标除以 |v|。箭头按比例缩放，方向不变。',
      '无论如何缩放，单位箭头的长度都是 1。两个箭头方向相同，使用相同的绘图比例。',
    ],
    vector: 'v', length: '|v|', unit: 'v / |v|', unitLength: '单位长度', plot: 'y z 平面上的向量 v 及其单位方向',
  },
};

export function Normalization({ language = 'en' }) {
  const t = normalizationCopy[languageOf(language)];
  const [scale, setScale] = useState(1);
  const [step, setStep] = useState(0);
  const state = normalizationState(scale);
  const origin = [58, 54];
  const point = ([y, z]) => [origin[0] + y * 24, origin[1] - z * 24];
  const endpoint = point(state.input.slice(1));
  const unitEnd = point(state.unit.slice(1));
  const foot = [endpoint[0], origin[1]];
  return <ExperimentFrame language={language} title={t.title} description={t.description} steps={t.steps} step={step} onStep={setStep}
    controls={<RangeControl label={t.scale} value={scale} min={0.2} max={2} step={0.05} onChange={setScale} display={`${fmt(scale, 2)}×`} />}
    readout={<Metrics><Metric label={t.vector} value={pair(state.input)} />{step >= 1 && <Metric label={t.length} value={fmt(state.length)} />}{step >= 2 && <Metric label={t.unit} value={pair(state.unit)} />}{step >= 3 && <Metric label={t.unitLength} value="1" />}</Metrics>}
    caption={t.captions[step]}>
    <Plot label={`${t.plot}. ${t.steps[step]}. ${t.vector} = ${pair(state.input)}. ${step >= 1 ? `${t.length} = ${fmt(state.length)}.` : ''}`}>
      <Grid origin={origin} scale={24} xs={[0, 2, 4, 6, 8, 10]} ys={[-8, -6, -4, -2, 0]} xMin={0} xMax={10} yMin={-8} yMax={0} />
      <line x1="36" y1={origin[1]} x2="320" y2={origin[1]} stroke="currentColor" opacity="0.35" />
      <line x1={origin[0]} y1="27" x2={origin[0]} y2="244" stroke="currentColor" opacity="0.35" />
      <text x="322" y="61" fill="currentColor" fontSize="18">y</text><text x="38" y="31" fill="currentColor" fontSize="18">z</text>
      <text x="35" y="77" fill="currentColor" fontSize="18">0</text>
      {step >= 1 && <>
        <polyline points={`${origin.join(',')} ${foot.join(',')} ${endpoint.join(',')}`} stroke="currentColor" opacity="0.5" strokeDasharray="5 5" strokeWidth="2" fill="none" />
        {scale >= 0.4 && <polyline points={`${foot[0] - 8},${foot[1]} ${foot[0] - 8},${foot[1] + 8} ${foot[0]},${foot[1] + 8}`} stroke="currentColor" opacity="0.5" fill="none" />}
        <text x={clamp((origin[0] + endpoint[0]) / 2 + 6, 28, 312)} y={clamp((origin[1] + endpoint[1]) / 2 + 25, 30, 242)} fill={A} fontSize="19">|v| = {fmt(state.length, 2)}</text>
      </>}
      <Arrow from={origin} to={endpoint} color={A} width={3} />
      <text x={clamp(endpoint[0] + 12, 26, 332)} y={endpoint[1] + 5} fill={A} fontSize="20">v</text>
      {step >= 2 && <>
        <Arrow from={origin} to={unitEnd} color={B} width={5} />
        <line x1={unitEnd[0] - 4} y1={unitEnd[1] + 7} x2="89" y2="104" stroke={B} strokeWidth="1.5" />
        <text x="90" y="123" fill={B} fontSize="18">v / |v|</text>
      </>}
      {step >= 3 && <>
        <circle cx={origin[0]} cy={origin[1]} r="24" stroke={B} opacity="0.6" strokeDasharray="3 4" fill="none" />
        <text x="119" y="31" fill={B} fontSize="19">|v / |v|| = 1</text>
      </>}
    </Plot>
  </ExperimentFrame>;
}

const matrixCopy = {
  en: {
    title: 'A matrix moves the whole square', description: 'The columns tell you where the two unit basis vectors go. Together they determine the transformed shape.',
    control: 'Top-right entry m₁₂ (row 1, column 2)', steps: ['Begin with area 1', 'Transform the basis vectors', 'Join the transformed corners', 'Read the determinant as signed area'],
    captions: [
      'The faint square has side length 1 and area 1. Keep this reference while the matrix changes.',
      'The first column sends e₁ to [2, 1]. The second sends e₂ to [m₁₂, 3]. Only m₁₂ changes.',
      'The far corner is the sum of the transformed basis vectors. Straight, parallel edges remain parallel.',
      'det(A) = 2 × 3 − m₁₂ × 1. Its magnitude is the new area; its sign records whether orientation is preserved or reversed.',
    ],
    matrix: 'Matrix A', first: 'A e₁', second: 'A e₂', determinant: 'det(A)', area: 'Transformed area', orientation: 'Orientation',
    preserved: 'Preserved', reversed: 'Reversed', collapsed: 'Collapsed to a line', areaWord: 'area', plot: 'Original unit square and its matrix-transformed parallelogram',
  },
  zh: {
    title: '矩阵变换整个正方形', description: '矩阵的两列分别确定两个单位基向量的新位置，它们共同确定变换后的形状。',
    control: '右上元素 m₁₂（第 1 行，第 2 列）', steps: ['从面积 1 开始', '变换两个基向量', '连接变换后的顶点', '用行列式读取带符号的面积'],
    captions: [
      '浅色正方形的边长为 1，面积为 1。改变矩阵时，保留它作为参照。',
      '第一列将 e₁ 变为 [2, 1]，第二列将 e₂ 变为 [m₁₂, 3]。这里只改变 m₁₂。',
      '最远顶点是两个变换后基向量的和。直边仍然笔直，平行边仍然平行。',
      'det(A) = 2 × 3 − m₁₂ × 1。绝对值是变换后的面积；正负号表示方向是否翻转。',
    ],
    matrix: '矩阵 A', first: 'A e₁', second: 'A e₂', determinant: 'det(A)', area: '变换后的面积', orientation: '方向',
    preserved: '保持', reversed: '翻转', collapsed: '压缩成一条直线', areaWord: '面积', plot: '原始单位正方形及矩阵变换后的平行四边形',
  },
};

export function MatrixTransform({ language = 'en' }) {
  const t = matrixCopy[languageOf(language)];
  const [upperRight, setUpperRight] = useState(1);
  const [step, setStep] = useState(0);
  const state = matrixTransformState(upperRight);
  const origin = [86, 220];
  const point = ([x, y]) => [origin[0] + x * 26, origin[1] - y * 26];
  const first = point(state.firstBasis);
  const second = point(state.secondBasis);
  const originalPoints = state.square.map(point).map(item => item.join(',')).join(' ');
  const transformedPoints = state.transformed.map(point).map(item => item.join(',')).join(' ');
  return <ExperimentFrame language={language} title={t.title} description={t.description} steps={t.steps} step={step} onStep={setStep}
    controls={<>
      <RangeControl label={t.control} value={upperRight} min={-2} max={8} step={0.1} onChange={setUpperRight} display={fmt(upperRight, 1)} />
      <div className="experiment-presets">{[1, 6, 8].map((value, index) => <Button key={value} type="button" variant="outline" size="sm" onClick={() => setUpperRight(value)}>{[t.preserved, t.collapsed, t.reversed][index]}</Button>)}</div>
    </>}
    readout={<Metrics><Metric label={t.matrix} value={`[[2, ${fmt(upperRight)}], [1, 3]]`} />{step >= 1 && <><Metric label={t.first} value={pair(state.firstBasis)} /><Metric label={t.second} value={pair(state.secondBasis)} /></>}{step >= 3 && <><Metric label={t.determinant} value={`6 − (${fmt(upperRight)}) = ${fmt(state.determinant)}`} /><Metric label={t.area} value={fmt(state.area)} /><Metric label={t.orientation} value={t[state.orientation]} /></>}</Metrics>}
    caption={t.captions[step]}>
    <Plot label={`${t.plot}. ${t.steps[step]}. ${step >= 3 ? `${t.determinant} = ${fmt(state.determinant)}. ${t[state.orientation]}.` : ''}`}>
      <Grid origin={origin} scale={26} xs={[-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} ys={[0, 1, 2, 3, 4, 5, 6]} xMin={-2} xMax={10} yMin={0} yMax={6} />
      <line x1="27" y1="220" x2="350" y2="220" stroke="currentColor" opacity="0.35" /><line x1="86" y1="239" x2="86" y2="53" stroke="currentColor" opacity="0.35" />
      <polygon points={originalPoints} stroke="currentColor" fill="currentColor" fillOpacity="0.07" strokeOpacity="0.5" strokeWidth="2" />
      <text x="64" y="243" fill="currentColor" fontSize="18">0</text><text x="111" y="243" textAnchor="middle" fill="currentColor" fontSize="18">1</text>
      {step >= 2 && <polygon points={transformedPoints} fill={A} fillOpacity="0.15" stroke={A} strokeWidth="2.5" />}
      {step >= 1 && <>
        <Arrow from={origin} to={first} color={A} /><Arrow from={origin} to={second} color={B} />
        <text x={first[0] + 9} y={first[1] + 14} fill={A} fontSize="18">Ae₁</text>
        <text x={clamp(second[0], 38, 320)} y={second[1] - 12} textAnchor="middle" fill={B} fontSize="18">Ae₂</text>
      </>}
      {step >= 3 && <text x="336" y="32" textAnchor="end" fill="currentColor" fontSize="21">{t.areaWord} = {fmt(state.area)}</text>}
    </Plot>
  </ExperimentFrame>;
}

const circleCopy = {
  en: {
    title: 'Sine and cosine are coordinates', description: 'Move around a circle of radius 1. The point’s horizontal and vertical coordinates are cosine and sine.',
    angle: 'Angle θ', steps: ['Rotate a unit radius', 'Project onto the x-axis', 'Complete the right triangle', 'Apply Pythagoras'],
    captions: [
      'θ starts on the positive x-axis and turns counterclockwise. The radius always has length 1.',
      'The horizontal coordinate is x = cos θ. It becomes negative on the left half of the circle.',
      'The vertical coordinate is y = sin θ. The two projection lengths form the legs of a right triangle.',
      'The hypotenuse has length 1, so x² + y² = cos² θ + sin² θ = 1 at every angle.',
    ],
    radians: 'θ in radians', cosine: 'x = cos θ', sine: 'y = sin θ', identity: 'cos² θ + sin² θ', plot: 'Unit circle with a rotating radius and horizontal and vertical projections',
  },
  zh: {
    title: '正弦和余弦就是坐标', description: '沿半径为 1 的圆移动。圆上点的水平坐标是余弦，竖直坐标是正弦。',
    angle: '角度 θ', steps: ['旋转单位半径', '投影到 x 轴', '构造直角三角形', '应用勾股定理'],
    captions: [
      'θ 从 x 轴正方向开始，逆时针旋转。半径长度始终为 1。',
      '水平坐标 x = cos θ。在圆的左半边，余弦为负。',
      '竖直坐标 y = sin θ。两个投影长度构成直角三角形的两条直角边。',
      '斜边长度为 1，因此任意角度下都有 x² + y² = cos² θ + sin² θ = 1。',
    ],
    radians: 'θ 的弧度值', cosine: 'x = cos θ', sine: 'y = sin θ', identity: 'cos² θ + sin² θ', plot: '单位圆、旋转半径及其水平和竖直投影',
  },
};

export function UnitCircle({ language = 'en' }) {
  const t = circleCopy[languageOf(language)];
  const [degrees, setDegrees] = useState(45);
  const [step, setStep] = useState(0);
  const state = unitCircleState(degrees);
  const origin = [180, 132];
  const point = [origin[0] + state.x * 90, origin[1] - state.y * 90];
  const xFoot = [point[0], origin[1]];
  const yFoot = [origin[0], point[1]];
  const arcEnd = [origin[0] + state.x * 26, origin[1] - state.y * 26];
  const cornerX = xFoot[0] - Math.sign(state.x) * 8;
  const cornerY = xFoot[1] - Math.sign(state.y) * 8;
  return <ExperimentFrame language={language} title={t.title} description={t.description} steps={t.steps} step={step} onStep={setStep}
    controls={<RangeControl label={t.angle} value={degrees} min={0} max={360} step={1} onChange={setDegrees} display={`${degrees}° = ${fmt(state.radians)} rad`} />}
    readout={<Metrics><Metric label={t.radians} value={fmt(state.radians)} />{step >= 1 && <Metric label={t.cosine} value={fmt(state.x)} />}{step >= 2 && <Metric label={t.sine} value={fmt(state.y)} />}{step >= 3 && <Metric label={t.identity} value={`${fmt(state.xSquared)} + ${fmt(state.ySquared)} = 1`} />}</Metrics>}
    caption={t.captions[step]}>
    <Plot label={`${t.plot}. ${t.steps[step]}. θ = ${degrees}°. ${step >= 1 ? `${t.cosine} = ${fmt(state.x)}.` : ''} ${step >= 2 ? `${t.sine} = ${fmt(state.y)}.` : ''}`}>
      <line x1="56" y1="132" x2="306" y2="132" stroke={GRID} strokeWidth="1.5" /><line x1="180" y1="20" x2="180" y2="244" stroke={GRID} strokeWidth="1.5" />
      <circle cx="180" cy="132" r="90" fill="none" stroke="currentColor" opacity="0.4" strokeWidth="1.5" />
      <text x="307" y="139" fill="currentColor" fontSize="18">x</text><text x="188" y="28" fill="currentColor" fontSize="18">y</text>
      <text x="277" y="155" fill="currentColor" fontSize="18">1</text><text x="65" y="155" fill="currentColor" fontSize="18">−1</text>
      <text x="158" y="155" fill="currentColor" fontSize="18">0</text>
      {degrees > 0 && degrees < 360 && <path d={`M 206 132 A 26 26 0 ${degrees > 180 ? 1 : 0} 0 ${arcEnd.join(' ')}`} stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />}
      {degrees === 360 && <circle cx="180" cy="132" r="26" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />}
      <text x="218" y="119" fill="currentColor" fontSize="18">θ</text>
      {step >= 2 && <polygon points={`${origin.join(',')} ${xFoot.join(',')} ${point.join(',')}`} fill={A} fillOpacity="0.12" />}
      {step >= 1 && <>
        <line x1={point[0]} y1={point[1]} x2={xFoot[0]} y2={xFoot[1]} stroke={A} strokeWidth="1.8" strokeDasharray="4 4" />
        <line x1={origin[0]} y1={origin[1]} x2={xFoot[0]} y2={xFoot[1]} stroke={A} strokeWidth="5" />
        <text x={(origin[0] + point[0]) / 2} y="178" textAnchor="middle" fill={A} fontSize="18">cos θ</text>
      </>}
      {step >= 2 && <>
        <line x1={point[0]} y1={point[1]} x2={yFoot[0]} y2={yFoot[1]} stroke={B} strokeWidth="1.8" strokeDasharray="4 4" />
        <line x1={origin[0]} y1={origin[1]} x2={yFoot[0]} y2={yFoot[1]} stroke={B} strokeWidth="5" />
        <line x1={xFoot[0]} y1={xFoot[1]} x2={point[0]} y2={point[1]} stroke={B} strokeWidth="2" />
        {Math.abs(state.x) > 0.15 && Math.abs(state.y) > 0.15 && <polyline points={`${cornerX},${xFoot[1]} ${cornerX},${cornerY} ${xFoot[0]},${cornerY}`} stroke="currentColor" opacity="0.7" fill="none" />}
        <text x={state.x >= 0 ? 161 : 199} y={(origin[1] + point[1]) / 2 + 5} textAnchor={state.x >= 0 ? 'end' : 'start'} fill={B} fontSize="18">sin θ</text>
      </>}
      <Arrow from={origin} to={point} color="currentColor" width={2.5} />
      <text x={(origin[0] + point[0]) / 2 + 10} y={(origin[1] + point[1]) / 2 - 10} fill="currentColor" fontSize="18">1</text>
      <circle cx={point[0]} cy={point[1]} r="5" fill={B} />
      {step >= 3 && <text x="180" y="256" textAnchor="middle" fill="currentColor" fontSize="19">cos² θ + sin² θ = 1</text>}
    </Plot>
  </ExperimentFrame>;
}

export const geometryExperiments = {
  dot: { title: { en: dotCopy.en.title, zh: dotCopy.zh.title }, Component: DotProjection },
  normalization: { title: { en: normalizationCopy.en.title, zh: normalizationCopy.zh.title }, Component: Normalization },
  matrix: { title: { en: matrixCopy.en.title, zh: matrixCopy.zh.title }, Component: MatrixTransform },
  trigonometry: { title: { en: circleCopy.en.title, zh: circleCopy.zh.title }, Component: UnitCircle },
};
