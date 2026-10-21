import React, { useId } from 'react';
import { MotionConfig, motion } from 'motion/react';

// Scene data comes from the bounded mathematical model, never from executable
// source. The guards here also keep a malformed preview out of SVG geometry.
const W = 480;
const H = 300;
const A = 'var(--math-a)';
const B = 'var(--math-b)';
const C = 'var(--math-c)';
const R = 'var(--math-result)';
const INK = 'var(--math-ink)';
const MUTED = 'var(--math-muted)';
const GRID = 'var(--math-grid)';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const num = (value, fallback = 0) => finite(value) ? value : fallback;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, num(value, lo)));
const numbers = values => Array.isArray(values) ? values.filter(finite) : [];
const str = value => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
const unique = values => [...new Set(Array.isArray(values) ? values.filter(value => ['string', 'number'].includes(typeof value)) : [])];
const fmt = value => {
  if (!finite(value)) return typeof value === 'number' ? 'out of range' : str(value);
  if (Object.is(value, -0)) return '0';
  if (Number.isInteger(value) && Math.abs(value) < 100000) return String(value);
  const rounded = value.toPrecision(4);
  return finite(Number(rounded)) ? Number(rounded).toString() : rounded;
};
const short = value => {
  const label = str(value);
  return label.length > 12 ? label.slice(0, 10) + '…' : label;
};
const same = (a, b) => a === b;

export function mathSceneDomain(values, includeZero = true) {
  const valid = numbers(values);
  if (includeZero) valid.push(0);
  if (!valid.length) return [-1, 1];
  let lo = Math.min(...valid);
  let hi = Math.max(...valid);
  if (lo === hi) {
    const pad = Math.max(1, Math.abs(lo) * .1);
    const original = lo;
    lo = finite(original - pad) ? original - pad : original;
    hi = finite(original + pad) ? original + pad : original;
  }
  // Dividing first avoids overflowing when a domain spans large signed values.
  return [lo, hi];
}

export function mathSceneScale(domain, start, end) {
  const [lo, hi] = domain;
  const divisor = Math.max(Math.abs(lo), Math.abs(hi), 1);
  const low = lo / divisor;
  const high = hi / divisor;
  const span = high - low || 1;
  return value => start + clamp((num(value) / divisor - low) / span, 0, 1) * (end - start);
}

function Text({ x, y, children, color = INK, anchor = 'middle', className = '', ...rest }) {
  const long = typeof children === 'string' && children.length > 38;
  return <text x={x} y={y} textAnchor={anchor} fill={color} className={'math-scene__label ' + className + (long ? ' math-scene__long' : '')} {...rest}>{children}</text>;
}

function Line({ x1, y1, x2, y2, color = GRID, width = 1, dash, ...rest }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray={dash} {...rest} />;
}

function Arrow({ x1, y1, x2, y2, color = A, width = 3, dashed = false, id, ...rest }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < .5) return <circle cx={x2} cy={y2} r={4} fill={color} />;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(9, length * .4);
  return <g {...rest}>
    <motion.line initial={false} animate={{ x1, y1, x2: x2 - ux * head * .6, y2: y2 - uy * head * .6 }} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '5 5' : undefined} />
    <motion.path initial={false} animate={{ d: 'M' + x2 + ',' + y2 + 'L' + (x2 - ux * head - uy * head * .48) + ',' + (y2 - uy * head + ux * head * .48) + 'L' + (x2 - ux * head + uy * head * .48) + ',' + (y2 - uy * head - ux * head * .48) + 'Z' }} fill={color} />
  </g>;
}

function Dot({ x, y, color = A, radius = 6, label, labelY = -14, hollow = false, ...rest }) {
  return <motion.g initial={false} animate={{ x, y }} {...rest}>
    <circle r={radius} fill={hollow ? 'var(--math-paper)' : color} stroke={color} strokeWidth={hollow ? 2 : 0} />
    {label !== undefined && <Text x={0} y={labelY} color={color}>{label}</Text>}
  </motion.g>;
}

function Axis({ values, x = 40, end = 440, y = 205, domain, ticks = true }) {
  const bounds = domain || mathSceneDomain(values);
  const scale = mathSceneScale(bounds, x, end);
  const tickValues = [...new Set([bounds[0], ...(bounds[0] < 0 && bounds[1] > 0 ? [0] : []), bounds[1]])];
  return <g className="math-scene__axis">
    <Line x1={x} y1={y} x2={end + 6} y2={y} color={MUTED} />
    <path d={'M' + (end + 1) + ',' + (y - 4) + 'l6,4l-6,4'} fill="none" stroke={MUTED} />
    {ticks && tickValues.map((value, index) => <g key={index}>
      <Line x1={scale(value)} y1={y - 4} x2={scale(value)} y2={y + 4} color={MUTED} />
      <Text x={scale(value)} y={y + 23} color={MUTED} className="math-scene__small">{fmt(value)}</Text>
    </g>)}
  </g>;
}

function Jump({ from, to, y, height = 40, color, label }) {
  const middle = (from + to) / 2;
  const d = 'M' + from + ',' + y + 'Q' + middle + ',' + (y - height * 2) + ' ' + to + ',' + y;
  return <g>
    <motion.path initial={false} animate={{ d }} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Dot x={to} y={y} color={color} radius={4} />
    <Text x={middle} y={y - height - 12} color={color}>{label}</Text>
  </g>;
}

function Bracket({ x, y, width, label, color = MUTED }) {
  return <g><path d={'M' + x + ',' + y + 'v5h' + width + 'v-5'} fill="none" stroke={color} />
    <Text x={x + width / 2} y={y + 23} color={color}>{label}</Text></g>;
}

function Notice({ children, y = 283 }) {
  return <Text x={W / 2} y={y} color={MUTED} className="math-scene__small math-scene__notice">{children}</Text>;
}

function Result({ children, y = 264, prefix }) {
  return <Text x={240} y={y} color={R} className="math-scene__result">{prefix}{children}</Text>;
}

function Comparison({ data }) {
  const a = num(data.a);
  const b = num(data.b);
  const result = data.result;
  const kronecker = /delta|kronecker|δ/i.test(data.operator || '');
  const mini = kronecker && Number.isInteger(a) && Number.isInteger(b) && a >= 0 && a <= 5 && b >= 0 && b <= 5;
  const extent = mini ? 304 : 430;
  const domain = mathSceneDomain([a, b]);
  const scale = mathSceneScale(domain, 48, extent);
  const aligned = a === b;
  const size = Math.max(3, a + 1, b + 1);
  const cell = 16;
  return <>
    <Axis domain={domain} x={48} end={extent} y={191} />
    <Line x1={scale(a)} y1={75} x2={scale(a)} y2={191} color={A} dash="4 4" />
    <Line x1={scale(b)} y1={129} x2={scale(b)} y2={191} color={B} dash="4 4" />
    <Dot x={scale(a)} y={89} color={A} radius={8} label={(kronecker ? 'i = ' : 'a = ') + fmt(a)} />
    <Dot x={scale(b)} y={143} color={B} radius={8} label={(kronecker ? 'j = ' : 'b = ') + fmt(b)} />
    {aligned && <Line x1={scale(a)} y1={99} x2={scale(b)} y2={130} color={R} width={3} />}
    <Text x={(48 + extent) / 2} y={32} color={MUTED}>{aligned ? 'Same position' : 'Two different positions'}</Text>
    {mini && <g>
      <Text x={393} y={44} className="math-scene__small">δᵢⱼ</Text>
      {Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => {
        const selected = row === a && column === b;
        return <g key={row + '-' + column}>
          <rect x={345 + column * cell} y={60 + row * cell} width={cell} height={cell} fill={selected ? R : 'transparent'} fillOpacity={selected ? .13 : 0} stroke={GRID} />
          <Text x={353 + column * cell} y={72 + row * cell} color={selected ? R : row === column ? INK : MUTED} className="math-scene__tiny">{row === column ? 1 : 0}</Text>
        </g>;
      }))}
      <Text x={393} y={178} color={MUTED} className="math-scene__small">row i, column j</Text>
    </g>}
    {result !== null && result !== undefined ? <Result>{kronecker ? 'δᵢⱼ = ' : fmt(a) + ' ' + (data.operator || '=') + ' ' + fmt(b) + ' → '}{str(result)}</Result> : <Notice>Comparison result was not recorded</Notice>}
  </>;
}

function Arithmetic({ data }) {
  const operation = data.operation;
  const a = num(data.a);
  const b = num(data.b, 1);
  const result = num(data.result);
  if (operation === 'multiply' && a >= 0 && b >= 0) {
    const edge = Math.max(a, b, 1);
    const unit = Math.min(180 / edge, 45);
    const width = Math.max(3, a * unit);
    const height = Math.max(3, b * unit);
    const x = 240 - width / 2;
    const y = 138 - height / 2;
    return <>
      <Text x={240} y={27} color={MUTED}>Two lengths make an area</Text>
      <motion.rect initial={false} animate={{ x, y, width, height }} fill={R} fillOpacity={.15} stroke={R} strokeWidth={2} />
      {Number.isInteger(a) && a <= 12 && Array.from({ length: Math.max(0, a - 1) }, (_, index) => <Line key={'x' + index} x1={x + (index + 1) * unit} y1={y} x2={x + (index + 1) * unit} y2={y + height} color={R} />)}
      {Number.isInteger(b) && b <= 12 && Array.from({ length: Math.max(0, b - 1) }, (_, index) => <Line key={'y' + index} x1={x} y1={y + (index + 1) * unit} x2={x + width} y2={y + (index + 1) * unit} color={R} />)}
      <Text x={240} y={y - 12} color={A}>{fmt(a)} across</Text>
      <Text x={x - 13} y={y + height / 2 + 4} color={B} anchor="end">{fmt(b)}</Text>
      <Text x={240} y={y + height + 23} color={R}>area = {fmt(result)}</Text>
      <Result>{fmt(a)} × {fmt(b)} = {fmt(result)}</Result>
    </>;
  }
  if ((operation === 'divide' || operation === 'mod') && a >= 0 && b > 0) {
    const scale = 360 / Math.max(a, b, 1);
    const ratio = a / b;
    const groups = Math.floor(num(ratio, Number.MAX_SAFE_INTEGER));
    const shown = Math.min(groups, 12);
    const remainder = finite(ratio) && groups <= Number.MAX_SAFE_INTEGER ? Math.max(0, a - groups * b) : 0;
    return <>
      <Text x={240} y={33} color={MUTED}>Fit lengths of {fmt(b)} into {fmt(a)}</Text>
      <Line x1={54} y1={93} x2={54 + a * scale} y2={93} color={A} width={8} />
      <Text x={54 + a * scale / 2} y={74} color={A}>whole length {fmt(a)}</Text>
      {Array.from({ length: shown }, (_, i) => <g key={i}>
        <motion.rect initial={false} animate={{ x: 54 + i * b * scale, y: 122, width: Math.max(1, b * scale - 3), height: 37 }} fill={B} fillOpacity={.2} stroke={B} />
        {shown <= 8 && <Text x={54 + (i + .5) * b * scale} y={146} color={B}>{fmt(b)}</Text>}
      </g>)}
      {groups > shown && <Text x={240} y={184} color={MUTED}>{shown} pieces shown{finite(ratio) ? ' of ' + fmt(groups) : ' · count exceeds numeric range'}</Text>}
      {remainder > 1e-9 && <g><motion.rect initial={false} animate={{ x: 54 + groups * b * scale, y: 122, width: Math.max(1, remainder * scale), height: 37 }} fill={C} fillOpacity={.3} stroke={C} />
        <Text x={Math.min(420, 54 + (groups * b + remainder / 2) * scale)} y={202} color={C}>remainder {fmt(remainder)}</Text></g>}
      <Bracket x={54} y={215} width={a * scale} label={groups + ' whole ' + (groups === 1 ? 'piece' : 'pieces') + (remainder > 1e-9 ? ' + remainder' : '')} />
      <Result y={280}>{fmt(a)} {operation === 'mod' ? 'mod' : '÷'} {fmt(b)} = {fmt(result)}</Result>
    </>;
  }
  if (operation === 'root' && a >= 0 && (b === 2 || !finite(data.b))) {
    const size = Math.min(160, Math.max(40, Math.sqrt(a) * 32));
    const x = 240 - size / 2;
    const y = 135 - size / 2;
    return <>
      <Text x={240} y={28} color={MUTED}>Which side length makes this area?</Text>
      <motion.rect initial={false} animate={{ x, y, width: size, height: size }} fill={A} fillOpacity={.14} stroke={A} strokeWidth={2} />
      <Text x={240} y={138} color={A}>area {fmt(a)}</Text>
      <Bracket x={x} y={y + size + 8} width={size} label={'side ' + fmt(result)} color={R} />
      <Result>√{fmt(a)} = {fmt(result)}</Result>
    </>;
  }
  if (operation === 'power' || operation === 'log') {
    const base = operation === 'log' ? b : a;
    const exponent = operation === 'log' ? result : b;
    const count = Math.max(1, Math.min(6, Math.floor(Math.abs(exponent))));
    const step = 340 / count;
    return <>
      <Text x={240} y={35} color={MUTED}>{operation === 'log' ? 'Count the repeated factors' : 'Multiply the same factor repeatedly'}</Text>
      {Array.from({ length: count }, (_, i) => <g key={i}>
        <circle cx={70 + (i + .5) * step} cy={128} r={Math.min(25, step * .32)} fill={A} fillOpacity={.15} stroke={A} strokeWidth={2} />
        <Text x={70 + (i + .5) * step} y={133} color={A}>{fmt(base)}</Text>
        {i < count - 1 && <Text x={70 + (i + 1) * step} y={133} color={MUTED}>×</Text>}
      </g>)}
      <Bracket x={70} y={174} width={340} label={fmt(exponent) + ' factors' + (exponent !== count ? ' · symbolic count' : '')} color={B} />
      <Result>{operation === 'log' ? 'log' + (b === Math.E ? 'ₑ' : ' base ' + fmt(b)) + '(' + fmt(a) + ') = ' + fmt(result) : fmt(a) + ' ^ ' + fmt(b) + ' = ' + fmt(result)}</Result>
    </>;
  }
  const rounding = ['floor', 'ceil', 'round'].includes(operation);
  const lo = Math.floor(a);
  const hi = Math.ceil(a) === lo ? lo + 1 : Math.ceil(a);
  const domain = rounding ? [lo - .25, hi + .25] : mathSceneDomain([0, a, b, result]);
  const scale = mathSceneScale(domain, 54, 426);
  return <>
    <Axis domain={domain} x={54} end={426} y={204} ticks={!rounding} />
    {rounding ? <>
      {[lo, hi].map(value => <g key={value}><Line x1={scale(value)} y1={194} x2={scale(value)} y2={214} color={MUTED} /><Text x={scale(value)} y={238} color={MUTED}>{fmt(value)}</Text></g>)}
      <Dot x={scale(a)} y={105} color={A} radius={8} label={'x = ' + fmt(a)} />
      <Arrow x1={scale(a)} y1={128} x2={scale(result)} y2={191} color={R} width={2} />
      <Dot x={scale(result)} y={204} color={R} radius={7} />
      <Text x={240} y={35} color={MUTED}>{operation === 'floor' ? 'Move to the integer at or below' : operation === 'ceil' ? 'Move to the integer at or above' : 'Move to the nearest integer'}</Text>
    </> : operation === 'absolute' ? <>
      <Line x1={scale(0)} y1={126} x2={scale(a)} y2={126} color={A} width={5} />
      <Dot x={scale(a)} y={204} color={A} label={fmt(a)} />
      <Dot x={scale(0)} y={204} color={MUTED} label="0" labelY={27} />
      <Text x={(scale(0) + scale(a)) / 2} y={104} color={R}>distance {fmt(result)}</Text>
      {a < 0 && <Jump from={scale(a)} to={scale(result)} y={204} height={30} color={R} label="same distance →" />}
    </> : ['min', 'max'].includes(operation) ? <>
      <Dot x={scale(a)} y={118} color={A} radius={8} label={'a = ' + fmt(a)} />
      <Dot x={scale(b)} y={160} color={B} radius={8} label={'b = ' + fmt(b)} />
      <Line x1={scale(result)} y1={83} x2={scale(result)} y2={204} color={R} dash="4 4" width={2} />
      <Dot x={scale(result)} y={204} color={R} radius={8} />
      <Text x={240} y={35} color={MUTED}>{operation === 'min' ? 'Keep the smaller position' : 'Keep the larger position'}</Text>
    </> : <>
      <Jump from={scale(0)} to={scale(a)} y={204} height={42} color={A} label={fmt(a)} />
      <Jump from={scale(a)} to={scale(result)} y={204} height={85} color={B} label={(operation === 'subtract' ? '− ' : operation === 'add' ? '+ ' : operation + ' ') + fmt(b)} />
      <Dot x={scale(result)} y={204} color={R} radius={7} label={fmt(result)} labelY={28} />
    </>}
    <Result y={284}>{operation === 'absolute' ? '|' + fmt(a) + '| = ' : rounding ? operation + '(' + fmt(a) + ') = ' : operation === 'min' || operation === 'max' ? operation + '(' + fmt(a) + ', ' + fmt(b) + ') = ' : ''}{fmt(result)}</Result>
  </>;
}

function Sequence({ data }) {
  const all = numbers(data.values);
  const count = Math.min(all.length, 12);
  const values = all.slice(0, count);
  const selected = Number.isInteger(data.index) && data.index >= 0 && data.index < all.length ? data.index : -1;
  const accumulator = num(data.accumulator);
  const recordedPrefix = data.accumulatorRecorded === false ? '' : 'recorded ';
  const previous = finite(data.previous) ? data.previous : data.operation === 'product' ? 1 : 0;
  const current = num(all[selected]);
  const step = 376 / Math.max(1, count);
  const max = Math.max(1, ...values.map(Math.abs), Math.abs(accumulator), Math.abs(previous));
  if (data.operation === 'mean') {
    const scale = mathSceneScale(mathSceneDomain([...values, accumulator]), 202, 55);
    return <>
      <Text x={240} y={24} color={MUTED}>Terms and their {recordedPrefix}mean</Text>
      <Line x1={42} y1={scale(0)} x2={442} y2={scale(0)} color={MUTED} />
      {values.map((value, i) => <g key={i}>
        <motion.rect initial={false} animate={{ x: 52 + i * step + step * .18, y: Math.min(scale(0), scale(value)), width: step * .64, height: Math.max(1, Math.abs(scale(value) - scale(0))) }} fill={i <= selected ? A : MUTED} fillOpacity={i === selected ? .8 : .25} />
        <Text x={52 + (i + .5) * step} y={scale(value) - 8} color={i === selected ? A : INK} className="math-scene__small">{fmt(value)}</Text>
        <Text x={52 + (i + .5) * step} y={226} color={MUTED} className="math-scene__small">{i + 1}</Text>
      </g>)}
      <motion.line initial={false} animate={{ y1: scale(accumulator), y2: scale(accumulator), x1: 43, x2: 438 }} stroke={R} strokeWidth={2} strokeDasharray="6 4" />
      <Text x={438} y={scale(accumulator) - 9} anchor="end" color={R}>mean {fmt(accumulator)}</Text>
      <Result y={267}>{recordedPrefix}mean = {fmt(accumulator)}</Result>
      {all.length > count && <Notice>First {count} of {all.length} terms; all terms remain in the calculation</Notice>}
    </>;
  }
  const product = data.operation === 'product';
  const applied = data.applied === true && selected >= 0;
  // Keep the tape's scale tied to this sequence, so a growing accumulator
  // actually grows on screen instead of filling an auto-rescaled bar each step.
  let running = product ? 1 : 0;
  const milestones = [0, running];
  for (const value of all) {
    running = product ? running * value : running + value;
    if (finite(running)) milestones.push(running);
  }
  const domain = mathSceneDomain([...milestones, previous, accumulator]);
  const scale = mathSceneScale(domain, 54, 426);
  return <>
    <Text x={240} y={25} color={MUTED}>{applied ? product ? 'This term scales the running product' : 'This term joins the running total' : (selected >= 0 ? 'Selected term and the ' : 'Terms and the ') + recordedPrefix + (product ? 'product' : 'sum')}</Text>
    {values.map((value, i) => <g key={i}>
      <motion.circle initial={false} animate={{ cx: 52 + (i + .5) * step, cy: i === selected ? 63 : 58, r: i === selected ? Math.min(17, step * .44) : Math.min(13, step * .38) }} fill={i === selected ? B : A} fillOpacity={i === selected ? .2 : i < selected ? .12 : .04} stroke={i === selected ? B : i < selected ? A : GRID} />
      <Text x={52 + (i + .5) * step} y={i === selected ? 68 : 63} color={i === selected ? B : i < selected ? A : MUTED} className="math-scene__small">{fmt(value)}</Text>
      <Text x={52 + (i + .5) * step} y={94} color={MUTED} className="math-scene__tiny">{i + 1}</Text>
    </g>)}
    <Axis domain={domain} x={54} end={426} y={210} />
    <motion.rect initial={false} animate={{ x: Math.min(scale(0), scale(applied ? previous : accumulator)), y: 160, width: Math.max(1, Math.abs(scale(applied ? previous : accumulator) - scale(0))), height: 26 }} fill={A} fillOpacity={.18} stroke={A} />
    <Text x={clamp((scale(0) + scale(applied ? previous : accumulator)) / 2, 120, 360)} y={150} color={A}>{applied ? 'before ' : recordedPrefix}{fmt(applied ? previous : accumulator)}</Text>
    {applied ? product ? <>
      <Arrow x1={scale(previous)} y1={173} x2={scale(accumulator)} y2={173} color={B} width={3} />
      <Text x={(scale(previous) + scale(accumulator)) / 2} y={125} color={B}>× {fmt(current)}</Text>
    </> : <Jump from={scale(previous)} to={scale(accumulator)} y={185} height={34} color={B} label={(current >= 0 ? '+ ' : '− ') + fmt(Math.abs(current))} /> : selected >= 0 ? <Text x={350} y={122} color={B}>term {fmt(current)}</Text> : <Text x={350} y={122} color={MUTED} className="math-scene__small">No selected term recorded</Text>}
    <Dot x={scale(accumulator)} y={210} color={R} radius={7} />
    <Result y={268}>{applied ? fmt(previous) + (product ? ' × ' : ' + ') + fmt(current) + ' = ' : recordedPrefix + (product ? 'product' : 'sum') + ' = '}{fmt(accumulator)}</Result>
    {all.length > count && <Notice>First {count} of {all.length} terms shown{selected >= 0 ? ' · selected term ' + (selected + 1) : ''}</Notice>}
  </>;
}

function Plane({ vectors, x = 50, y = 38, width = 380, height = 190, unitCircle = false, xLabel = 'x', yLabel = 'y', children }) {
  const extent = Math.max(unitCircle ? 1.35 : 1, ...vectors.flatMap(vector => numbers(vector).map(Math.abs)));
  const unit = (Math.min(width, height) / 2.35) / extent;
  const origin = [x + width / 2, y + height / 2];
  const point = vector => [origin[0] + num(vector?.[0]) * unit, origin[1] - num(vector?.[1]) * unit];
  const zero = point([0, 0]);
  return <g>
    {[-2, -1, 1, 2].map(tick => Math.abs(tick) <= extent && <g key={tick}>
      <Line x1={zero[0] + tick * unit} y1={y} x2={zero[0] + tick * unit} y2={y + height} />
      <Line x1={x} y1={zero[1] + tick * unit} x2={x + width} y2={zero[1] + tick * unit} />
    </g>)}
    <Arrow x1={x} y1={zero[1]} x2={x + width} y2={zero[1]} color={MUTED} width={1} />
    <Arrow x1={zero[0]} y1={y + height} x2={zero[0]} y2={y} color={MUTED} width={1} />
    <Text x={x + width + 3} y={zero[1] + 19} color={MUTED} className="math-scene__small">{xLabel}</Text>
    <Text x={zero[0] + 13} y={y + 2} color={MUTED} className="math-scene__small">{yLabel}</Text>
    <Text x={zero[0] - 10} y={zero[1] + 17} color={MUTED} className="math-scene__tiny">0</Text>
    {unitCircle && <circle cx={zero[0]} cy={zero[1]} r={unit} fill="none" stroke={GRID} strokeDasharray="4 4" />}
    {children({ point, origin, unit })}
  </g>;
}

function Vector({ data }) {
  const a = numbers(data.a);
  const b = numbers(data.b);
  const result = Array.isArray(data.result) ? data.result : [];
  const operation = data.operation;
  if (operation === 'norm') {
    const nonzero = a.map((value, i) => [value, i]).filter(([value]) => value !== 0);
    const indices = nonzero.length <= 2 ? nonzero.map(([, i]) => i) : [0, 1];
    if (!indices.length) indices.push(0);
    if (indices.length === 1) indices.push(indices[0] === 0 ? 1 : 0);
    const projected = indices.map(i => num(a[i]));
    const axisNames = ['x', 'y', 'z', 'w'];
    return <>
      <Plane vectors={[projected]} xLabel={axisNames[indices[0]] || 'x'} yLabel={axisNames[indices[1]] || 'y'}>
        {({ point, origin }) => {
          const p = point(projected), corner = point([projected[0], 0]);
          return <>
            <Line x1={origin[0]} y1={origin[1]} x2={corner[0]} y2={corner[1]} color={A} width={3} />
            <Line x1={corner[0]} y1={corner[1]} x2={p[0]} y2={p[1]} color={B} width={3} />
            <Arrow x1={origin[0]} y1={origin[1]} x2={p[0]} y2={p[1]} color={R} />
            <Text x={(origin[0] + corner[0]) / 2} y={origin[1] + 23} color={A}>{fmt(projected[0])}</Text>
            <Text x={corner[0] + 12} y={(corner[1] + p[1]) / 2} color={B} anchor="start">{fmt(projected[1])}</Text>
            <Text x={clamp(p[0], 85, 385)} y={Math.max(30, p[1] - 15)} color={R}>{nonzero.length <= 2 && finite(data.result) ? 'length ' + fmt(data.result) : 'component geometry'}</Text>
          </>;
        }}
      </Plane>
      {finite(data.result) ? <Result y={277}>‖a‖ = {fmt(data.result)}</Result> : <Notice y={277}>No numeric length was recorded</Notice>}
      {nonzero.length > 2 && <Notice y={297}>All components: [{a.map(fmt).join(', ')}]</Notice>}
    </>;
  }
  if (operation === 'outer') {
    const matrix = Array.isArray(result[0]) ? result : a.map(av => b.map(bv => av * bv));
    return <>
      <Text x={240} y={27} color={MUTED}>Every row component meets every column component</Text>
      <MatrixGrid values={matrix} x={180} y={85} cell={Math.min(40, 180 / Math.max(1, b.length))} color={R} row={data.index} />
      {a.slice(0, 4).map((value, i) => <Text key={i} x={151} y={110 + i * Math.min(40, 180 / Math.max(1, b.length))} color={A}>{fmt(value)}</Text>)}
      {b.slice(0, 4).map((value, i) => <Text key={i} x={200 + i * Math.min(40, 180 / Math.max(1, b.length))} y={65} color={B}>{fmt(value)}</Text>)}
      <Notice>Each cell is aᵢ × bⱼ</Notice>
    </>;
  }
  if (operation === 'cross' && a.length >= 3 && b.length >= 3) {
    const extent = Math.max(1, ...a.map(Math.abs), ...b.map(Math.abs), ...numbers(result).map(Math.abs));
    const origin = [240, 170];
    const project = vector => {
      const x = num(vector[0]) / extent * 74;
      const y = num(vector[1]) / extent * 74;
      const z = num(vector[2]) / extent * 74;
      return [origin[0] + x - y * .66, origin[1] + x * .33 + y * .33 - z];
    };
    const pa = project(a), pb = project(b), pr = project(result);
    const sum = project(a.map((value, i) => value + num(b[i])));
    return <>
      <Text x={240} y={25} color={MUTED}>The cross product stands perpendicular to both inputs</Text>
      {[['x', [extent, 0, 0]], ['y', [0, extent, 0]], ['z', [0, 0, extent]]].map(([name, value]) => { const p = project(value); return <g key={name}><Arrow x1={origin[0]} y1={origin[1]} x2={p[0]} y2={p[1]} color={MUTED} width={1} /><Text x={p[0] + 9} y={p[1] + 5} color={MUTED}>{name}</Text></g>; })}
      <path d={'M' + origin.join(',') + 'L' + pa.join(',') + 'L' + sum.join(',') + 'L' + pb.join(',') + 'Z'} fill={C} fillOpacity={.12} stroke={C} strokeDasharray="4 4" />
      {[[pa, A, 'a'], [pb, B, 'b'], [pr, R, 'a × b']].map(([p, color, label]) => <g key={label}><Arrow x1={origin[0]} y1={origin[1]} x2={p[0]} y2={p[1]} color={color} /><Text x={p[0]} y={p[1] - 12} color={color}>{label}</Text></g>)}
      <Result y={274}>[{numbers(result).map(fmt).join(', ')}]</Result>
    </>;
  }
  const resultVector = numbers(result);
  const output = resultVector.length ? resultVector : a;
  const isDot = operation === 'dot';
  return <>
    <Plane vectors={[a, b, output]} height={isDot ? 150 : 190} y={27} unitCircle={operation === 'normalize'} xLabel={operation === 'complex' ? 'Re' : 'x'} yLabel={operation === 'complex' ? 'Im' : 'y'}>
      {({ point, origin }) => {
        const pa = point(a), pb = point(b), pr = point(output);
        const projection = isDot && b.some(value => value !== 0) ? a.slice(0, 2).reduce((sum, value, i) => sum + value * num(b[i]), 0) / (b.slice(0, 2).reduce((sum, value) => sum + value * value, 0) || 1) : 0;
        const pp = point(b.map(value => value * projection));
        return <>
          {operation === 'add' && <><Arrow x1={pa[0]} y1={pa[1]} x2={pr[0]} y2={pr[1]} color={B} dashed width={2} /><Arrow x1={pb[0]} y1={pb[1]} x2={pr[0]} y2={pr[1]} color={A} dashed width={2} /></>}
          <Arrow x1={origin[0]} y1={origin[1]} x2={pa[0]} y2={pa[1]} color={A} width={operation === 'normalize' ? 5 : 3} />
          <Text x={pa[0] - 7} y={pa[1] - 12} color={A}>a [{a.map(fmt).join(', ')}]</Text>
          {b.length > 0 && <><Arrow x1={origin[0]} y1={origin[1]} x2={pb[0]} y2={pb[1]} color={B} /><Text x={pb[0] + 8} y={pb[1] + 21} color={B}>b [{b.map(fmt).join(', ')}]</Text></>}
          {isDot ? <><Line x1={pa[0]} y1={pa[1]} x2={pp[0]} y2={pp[1]} color={C} dash="4 4" /><Arrow x1={origin[0]} y1={origin[1]} x2={pp[0]} y2={pp[1]} color={C} width={5} /></> : <><Arrow x1={origin[0]} y1={origin[1]} x2={pr[0]} y2={pr[1]} color={R} width={3} /><Text x={pr[0] + 8} y={pr[1] - 27} color={R}>{operation === 'normalize' ? 'length 1' : operation === 'scale' ? '× ' + fmt(data.scalar) : 'result'}</Text></>}
          {operation === 'complex' && data.action === 'multiply' && b.length >= 2 && <Text x={240} y={18} color={MUTED} className="math-scene__small">{b[0] === 0 && b[1] === 1 ? 'Multiply by i: turn 90° counterclockwise' : 'Complex multiplication rotates and scales'}</Text>}
          {a.length > 2 && <Text x={80} y={211} color={MUTED} anchor="start" className="math-scene__small">x–y view · all components below</Text>}
        </>;
      }}
    </Plane>
    {isDot ? <>
      {a.slice(0, 4).map((value, i) => <g key={i}>
        <Text x={64 + i * (352 / Math.max(1, Math.min(4, a.length)))} y={211} anchor="start"><tspan fill={A}>{fmt(value)}</tspan><tspan fill={MUTED}> × </tspan><tspan fill={B}>{fmt(b[i])}</tspan></Text>
        <Text x={64 + i * (352 / Math.max(1, Math.min(4, a.length)))} y={235} anchor="start" color={C}>{fmt(value * num(b[i]))}</Text>
      </g>)}
      <Result y={278}>a · b = {fmt(data.result)}</Result>
    </> : <Result y={277}>{operation === 'normalize' ? 'â' : operation === 'scale' ? fmt(data.scalar) + 'a' : operation === 'complex' ? 'z' : 'a + b'} = {operation === 'complex' ? fmt(output[0]) + (num(output[1]) < 0 ? ' − ' : ' + ') + fmt(Math.abs(num(output[1]))) + 'i' : '[' + output.map(fmt).join(', ') + ']'}</Result>}
  </>;
}

function MatrixGrid({ values, x, y, cell = 30, color = A, row, column, name, emphasizeDiagonal = false, transpose = false }) {
  const rows = Array.isArray(values) ? values.slice(0, 4).map(values => numbers(values).slice(0, 4)) : [];
  const columns = Math.max(1, ...rows.map(values => values.length));
  return <g>
    {name && <Text x={x + columns * cell / 2} y={y - 14} color={color}>{name}</Text>}
    <path d={'M' + (x - 6) + ',' + y + 'h-5v' + (rows.length * cell) + 'h5M' + (x + columns * cell + 6) + ',' + y + 'h5v' + (rows.length * cell) + 'h-5'} fill="none" stroke={color} strokeWidth={1.5} />
    {rows.map((values, i) => values.map((value, j) => {
      const selected = (row !== undefined && i === row) || (column !== undefined && j === column) || emphasizeDiagonal && i === j;
      return <g key={i + '-' + j}>
        <motion.rect initial={false} animate={{ x: x + j * cell + 1, y: y + i * cell + 1, width: cell - 2, height: cell - 2, opacity: selected ? 1 : 0 }} fill={color} fillOpacity={.13} rx={2} />
        <Text x={x + (j + .5) * cell} y={y + (i + .5) * cell + 5} color={selected ? color : INK} className={cell < 28 ? 'math-scene__small' : ''}>{fmt(value)}</Text>
      </g>;
    }))}
  </g>;
}

function Matrix({ data }) {
  const a = Array.isArray(data.a) ? data.a : [];
  const b = Array.isArray(data.b) ? data.b : [];
  const result = Array.isArray(data.result) ? data.result : [];
  const row = clamp(Math.floor(num(data.row)), 0, Math.max(0, a.length - 1));
  const column = clamp(Math.floor(num(data.column)), 0, Math.max(0, num(b[0]?.length, a[0]?.length) - 1));
  if (data.operation === 'shapes') {
    const rows = a.length;
    const columns = Math.max(0, ...a.map(values => Array.isArray(values) ? values.length : 0));
    const visibleRows = Math.min(4, rows);
    const visibleColumns = Math.min(4, columns);
    const cell = 35;
    const x = 240 - visibleColumns * cell / 2;
    const y = 60;
    return <>
      <MatrixGrid values={a} x={x} y={y} cell={cell} color={A} name={short(data.name || 'X')} />
      <Text x={x - 30} y={y + visibleRows * cell / 2 + 5} color={A} anchor="end">{rows} rows</Text>
      <Bracket x={x} y={y + visibleRows * cell + 12} width={visibleColumns * cell} label={columns + ' columns'} color={B} />
      <Notice y={275}>{rows > 4 || columns > 4 ? 'First 4 × 4 entries shown · full shape ' + rows + ' × ' + columns : 'Shape: ' + rows + ' rows × ' + columns + ' columns'}</Notice>
    </>;
  }
  if (data.operation === 'tensor') {
    const resultRows = Math.min(4, result.length);
    const resultColumns = Math.min(4, result[0]?.length || 1);
    return <>
      <Text x={240} y={28} color={MUTED}>A ⊗ B · each entry of A scales a copy of B</Text>
      <MatrixGrid values={a} x={26} y={63} cell={22} color={A} name="A" />
      <MatrixGrid values={b} x={366} y={63} cell={22} color={B} name="B" />
      <MatrixGrid values={result} x={240 - resultColumns * 17} y={85} cell={34} color={R} name="block product" />
      {Array.from({ length: Math.max(0, resultRows - 1) }, (_, i) => (i + 1) % Math.max(1, b.length) === 0 && <Line key={'r' + i} x1={240 - resultColumns * 17} y1={85 + (i + 1) * 34} x2={240 + resultColumns * 17} y2={85 + (i + 1) * 34} color={R} width={2} />)}
      {Array.from({ length: Math.max(0, resultColumns - 1) }, (_, i) => (i + 1) % Math.max(1, b[0]?.length || 1) === 0 && <Line key={'c' + i} x1={240 - resultColumns * 17 + (i + 1) * 34} y1={85} x2={240 - resultColumns * 17 + (i + 1) * 34} y2={85 + resultRows * 34} color={R} width={2} />)}
      <Notice y={275}>{result.length > 4 || result[0]?.length > 4 ? 'First 4 × 4 of the block product shown' : 'Block boundaries follow the shape of B'}</Notice>
    </>;
  }
  if (data.operation === 'determinant' && a.length === 2 && a[0]?.length === 2) {
    const u = [num(a[0][0]), num(a[1]?.[0])];
    const v = [num(a[0][1]), num(a[1]?.[1])];
    const sum = [u[0] + v[0], u[1] + v[1]];
    return <>
      <Plane vectors={[u, v, sum, [1, 1]]} x={100} y={28} width={330} height={204}>
        {({ point, origin }) => {
          const p0 = origin, pu = point(u), pv = point(v), ps = point(sum);
          const unit = [[0, 0], [1, 0], [1, 1], [0, 1]].map(point);
          return <>
            <path d={'M' + unit.map(value => value.join(',')).join('L') + 'Z'} fill="none" stroke={MUTED} strokeDasharray="4 4" />
            <motion.path initial={false} animate={{ d: 'M' + [p0, pu, ps, pv].map(value => value.join(',')).join('L') + 'Z' }} fill={R} fillOpacity={.15} stroke={R} />
            <Arrow x1={p0[0]} y1={p0[1]} x2={pu[0]} y2={pu[1]} color={A} /><Arrow x1={p0[0]} y1={p0[1]} x2={pv[0]} y2={pv[1]} color={B} />
            <Text x={pu[0]} y={pu[1] - 12} color={A}>[{u.map(fmt).join(', ')}]</Text>
            <Text x={pv[0] + 9} y={pv[1] + 20} color={B}>[{v.map(fmt).join(', ')}]</Text>
          </>;
        }}
      </Plane>
      <MatrixGrid values={a} x={28} y={37} cell={26} color={A} name="A" />
      <Result y={271}>signed area = det(A) = {fmt(data.result)}</Result>
    </>;
  }
  if (data.operation === 'rotation') {
    const u = [num(a[0]?.[0]), num(a[1]?.[0])];
    const v = [num(a[0]?.[1]), num(a[1]?.[1])];
    return <>
      <Plane vectors={[u, v, [1, 1]]} unitCircle>
        {({ point, origin, unit }) => {
          const pu = point(u), pv = point(v), px = point([1, 0]), py = point([0, 1]);
          return <><circle cx={origin[0]} cy={origin[1]} r={unit} fill="none" stroke={GRID} />
            <Arrow x1={origin[0]} y1={origin[1]} x2={px[0]} y2={px[1]} color={A} dashed width={1.5} /><Arrow x1={origin[0]} y1={origin[1]} x2={py[0]} y2={py[1]} color={B} dashed width={1.5} />
            <Arrow x1={origin[0]} y1={origin[1]} x2={pu[0]} y2={pu[1]} color={A} /><Arrow x1={origin[0]} y1={origin[1]} x2={pv[0]} y2={pv[1]} color={B} />
            <Text x={pu[0]} y={pu[1] - 12} color={A}>first basis</Text><Text x={pv[0]} y={pv[1] + 20} color={B}>second basis</Text>
          </>;
        }}
      </Plane>
      <Notice>The columns are the new directions of the unit axes</Notice>
    </>;
  }
  if (data.operation === 'multiply') {
    const rowValues = Array.isArray(a[row]) ? a[row] : [];
    const completePair = rowValues.length > 0 && rowValues.length === b.length && rowValues.every(finite) && b.every(values => finite(values?.[column]));
    const inner = Math.min(4, rowValues.length, b.length);
    const terms = completePair ? Array.from({ length: inner }, (_, i) => [a[row][i], b[i][column]]) : [];
    const calculated = terms.length > 0 && terms.length === rowValues.length ? terms.reduce((sum, pair) => sum + pair[0] * pair[1], 0) : null;
    const cellValue = terms.length > 0 ? finite(result[row]?.[column]) ? result[row][column] : finite(calculated) ? calculated : null : null;
    return <>
      <MatrixGrid values={a} x={40} y={49} cell={29} row={row} color={A} name="A · selected row" />
      {b.length > 0 ? <><Text x={216} y={102} color={MUTED}>×</Text>
        <MatrixGrid values={b} x={270} y={49} cell={29} column={column} color={B} name="B · selected column" /></> : <Text x={342} y={102} color={MUTED}>Column not recorded</Text>}
      <Line x1={49} y1={184} x2={431} y2={184} />
      <Text x={240} y={214}>{terms.map((pair, i) => <React.Fragment key={i}>{i > 0 && <tspan fill={MUTED}> + </tspan>}<tspan fill={A}>{fmt(pair[0])}</tspan><tspan fill={MUTED}> × </tspan><tspan fill={B}>{fmt(pair[1])}</tspan></React.Fragment>)}</Text>
      {cellValue !== null ? <Result y={250}>C[{row}, {column}] = {fmt(cellValue)}</Result> : <Notice y={250}>Output cell is unavailable</Notice>}
      <Notice>{terms.length ? 'One row meets one column to make one output cell' : 'A complete row and column are needed to calculate an output'}</Notice>
    </>;
  }
  const identity = data.operation === 'identity';
  const output = result.length ? result : a;
  return <>
    {identity ? <MatrixGrid values={output} x={240 - Math.min(4, output[0]?.length || 1) * 22} y={65} cell={44} color={R} emphasizeDiagonal name="Identity" /> : <>
      <MatrixGrid values={a} x={53} y={65} cell={34} color={A} row={row} name="rows" />
      <Arrow x1={214} y1={125} x2={264} y2={125} color={MUTED} width={1.5} />
      <MatrixGrid values={output} x={299} y={65} cell={34} color={B} column={row} name="columns" />
    </>}
    <Notice y={268}>{identity ? 'The diagonal preserves each coordinate; every other entry is 0' : 'Each row becomes a column, with its values in the same order'}</Notice>
  </>;
}

function Sets({ data }) {
  if (data.operation === 'interval') {
    const intervals = (Array.isArray(data.intervals) ? data.intervals : []).filter(interval => finite(interval.lo) && finite(interval.hi)).slice(0, 4);
    const domain = mathSceneDomain(intervals.flatMap(interval => [interval.lo, interval.hi]), false);
    const sx = mathSceneScale(domain, 75, 418);
    return <>
      <Text x={240} y={24} color={MUTED}>{data.intervalOperation ? str(data.intervalOperation) + ' of intervals' : 'Open endpoints exclude; filled endpoints include'}</Text>
      {intervals.map((interval, index) => {
        const y = 61 + index * 53;
        const color = index === 0 ? A : index === 1 ? B : R;
        const openLeft = interval.openLeft ?? interval.openLo;
        const openRight = interval.openRight ?? interval.openHi;
        return <g key={index}>
          <Text x={51} y={y + 5} anchor="end" color={color}>{short(interval.name || String.fromCharCode(65 + index))}</Text>
          <Line x1={64} y1={y} x2={435} y2={y} color={GRID} />
          <motion.line initial={false} animate={{ x1: sx(interval.lo), y1: y, x2: sx(interval.hi), y2: y }} stroke={color} strokeWidth={4} />
          <Dot x={sx(interval.lo)} y={y} color={color} radius={6} hollow={openLeft} label={fmt(interval.lo)} labelY={25} />
          <Dot x={sx(interval.hi)} y={y} color={color} radius={6} hollow={openRight} label={fmt(interval.hi)} labelY={25} />
          <Text x={240} y={y - 11} color={color} className="math-scene__small">{openLeft ? '(' : '['}{fmt(interval.lo)}, {fmt(interval.hi)}{openRight ? ')' : ']'}</Text>
        </g>;
      })}
      {!intervals.length && <Notice y={145}>No numeric interval endpoints in this snapshot</Notice>}
      {data.intervals?.length > intervals.length && <Notice>First {intervals.length} intervals shown</Notice>}
    </>;
  }
  const a = unique(data.a), b = unique(data.b);
  const both = a.filter(value => b.some(other => same(value, other)));
  const onlyA = a.filter(value => !b.some(other => same(value, other)));
  const onlyB = b.filter(value => !a.some(other => same(value, other)));
  const operation = data.operation;
  const selected = value => operation === 'membership' ? same(value, data.element)
    : operation === 'intersection' ? both.includes(value)
    : operation === 'difference' ? onlyA.includes(value)
    : operation === 'subset' ? a.includes(value) : true;
  const regions = [[onlyA, 127, A], [both, 240, R], [onlyB, 353, B]];
  const omitted = regions.reduce((sum, [values]) => sum + Math.max(0, values.length - 8), 0);
  return <>
    <ellipse cx={179} cy={139} rx={112} ry={91} fill={A} fillOpacity={.055} stroke={A} strokeWidth={2} />
    <ellipse cx={301} cy={139} rx={112} ry={91} fill={B} fillOpacity={.055} stroke={B} strokeWidth={2} />
    <Text x={120} y={36} color={A}>A</Text><Text x={360} y={36} color={B}>B</Text>
    {regions.map(([values, x, color], region) => <g key={region}>
      {values.slice(0, 8).map((value, index) => {
        const cols = values.length > 4 ? 2 : 1;
        const px = x + (cols === 2 ? (index % 2 ? 23 : -23) : 0);
        const py = 105 + Math.floor(index / cols) * 25 - (Math.min(4, Math.ceil(values.length / cols)) - 1) * 7;
        const active = selected(value);
        return <motion.g initial={false} key={typeof value + '-' + value} animate={{ x: px, y: py, opacity: active ? 1 : .45 }}>
          <circle r={active ? 13 : 3} fill={active ? color : MUTED} fillOpacity={active ? .12 : .6} stroke={active ? color : 'none'} />
          <Text x={0} y={active ? 5 : 16} color={active ? color : MUTED} className="math-scene__small">{short(value)}</Text>
        </motion.g>;
      })}
      {!values.length && <Text x={x} y={143} color={MUTED}>∅</Text>}
    </g>)}
    <Result y={260}>{operation === 'membership' ? typeof data.result === 'boolean' ? short(data.element) + (data.result ? ' ∈ A' : ' ∉ A') : 'Membership result was not recorded' : operation === 'subset' ? typeof data.result === 'boolean' ? 'A ⊆ B: ' + str(data.result) : 'Subset result was not recorded' : operation === 'intersection' ? 'A ∩ B' : operation === 'difference' ? 'A ∖ B' : 'A ∪ B'}</Result>
    {omitted > 0 && <Notice>{omitted} additional elements omitted from the drawing</Notice>}
  </>;
}

function curveGeometry(points, { left = 52, right = 430, top = 38, bottom = 226, discontinuities = [] } = {}) {
  const valid = (Array.isArray(points) ? points : []).filter(point => Array.isArray(point) && finite(point[0]) && finite(point[1])).slice(0, 180);
  if (!valid.length) return null;
  const xDomain = mathSceneDomain(valid.map(point => point[0]));
  const yDomain = mathSceneDomain(valid.map(point => point[1]));
  const sx = mathSceneScale(xDomain, left, right), sy = mathSceneScale(yDomain, bottom, top);
  const breaks = numbers(discontinuities);
  const crossesBreak = (before, after) => breaks.some(value => before < value && after >= value || before <= value && after > value || before > value && after <= value || before >= value && after < value);
  return { points: valid, xDomain, yDomain, sx, sy, left, right, top, bottom, path: valid.map((point, i) => (!i || crossesBreak(valid[i - 1][0], point[0]) ? 'M' : 'L') + sx(point[0]) + ',' + sy(point[1])).join('') };
}

function PlotAxes({ geometry }) {
  const { left, right, top, bottom, sx, sy, xDomain, yDomain } = geometry;
  return <g>
    <Line x1={left} y1={sy(0)} x2={right} y2={sy(0)} color={MUTED} />
    <Line x1={sx(0)} y1={top} x2={sx(0)} y2={bottom} color={MUTED} />
    {[xDomain[0], xDomain[1]].map((value, i) => <Text key={'x' + i} x={sx(value)} y={bottom + 20} color={MUTED} className="math-scene__small">{fmt(value)}</Text>)}
    {[yDomain[0], yDomain[1]].map((value, i) => <Text key={'y' + i} x={left - 8} y={sy(value) + 4} anchor="end" color={MUTED} className="math-scene__small">{fmt(value)}</Text>)}
    <Text x={right + 9} y={sy(0) + 4} color={MUTED} className="math-scene__small">x</Text>
    <Text x={sx(0) + 12} y={top} color={MUTED} className="math-scene__small">y</Text>
  </g>;
}

function FunctionScene({ data }) {
  const geometry = curveGeometry(data.points, { discontinuities: data.discontinuities });
  if (!geometry) return <><Notice y={145}>No sampled function values in this snapshot</Notice><Result>{finite(data.result) ? fmt(data.result) : ''}</Result></>;
  const { points, sx, sy, path, top, bottom, xDomain } = geometry;
  const x = num(data.x);
  const nearest = points.reduce((best, point) => Math.abs(point[0] - x) < Math.abs(best[0] - x) ? point : best, points[0]);
  const exactPoint = finite(data.result) && !['derivative', 'integral'].includes(data.operation);
  const pointX = exactPoint ? x : nearest[0];
  const y = exactPoint ? data.result : nearest[1];
  const px = sx(pointX), py = sy(y);
  const secant = data.operation === 'derivative' && finite(data.a) && finite(data.b) && data.a !== data.b;
  const nearestTo = input => points.reduce((best, point) => Math.abs(point[0] - input) < Math.abs(best[0] - input) ? point : best, points[0]);
  const secantA = secant ? nearestTo(data.a) : null;
  const secantB = secant ? nearestTo(data.b) : null;
  const drawSecant = secant && secantA[0] === data.a && secantB[0] === data.b;
  const integral = data.operation === 'integral';
  const low = finite(data.a) ? Math.min(data.a, num(data.b, x)) : xDomain[0];
  const high = finite(data.b) ? Math.max(num(data.a), data.b) : x;
  const area = points.filter(point => point[0] >= low && point[0] <= high);
  const tangentWidth = (xDomain[1] - xDomain[0]) * .18;
  return <>
    <PlotAxes geometry={geometry} />
    {integral && area.length > 1 && <>
      <path d={'M' + sx(area[0][0]) + ',' + sy(0) + area.map(point => 'L' + sx(point[0]) + ',' + sy(point[1])).join('') + 'L' + sx(area.at(-1)[0]) + ',' + sy(0) + 'Z'} fill={C} fillOpacity={.19} />
      {area.filter((_, index) => index % Math.max(1, Math.ceil(area.length / 16)) === 0).map((point, i) => <Line key={i} x1={sx(point[0])} y1={sy(0)} x2={sx(point[0])} y2={sy(point[1])} color={C} />)}
    </>}
    <path d={path} fill="none" stroke={A} strokeWidth={2.7} strokeLinejoin="round" />
    {points.filter(point => numbers(data.discontinuities).includes(point[0])).map((point, index) => <Dot key={'break' + index} x={sx(point[0])} y={sy(point[1])} color={A} radius={4} />)}
    <motion.line initial={false} animate={{ x1: px, y1: sy(0), x2: px, y2: py }} stroke={B} strokeDasharray="4 4" />
    <motion.line initial={false} animate={{ x1: sx(0), y1: py, x2: px, y2: py }} stroke={R} strokeDasharray="4 4" />
    {drawSecant ? <>
      <Line x1={sx(secantA[0])} y1={sy(secantA[1])} x2={sx(secantB[0])} y2={sy(secantB[1])} color={C} width={2.4} />
      <Line x1={sx(secantA[0])} y1={sy(secantA[1])} x2={sx(secantB[0])} y2={sy(secantA[1])} color={B} dash="4 4" />
      <Line x1={sx(secantB[0])} y1={sy(secantA[1])} x2={sx(secantB[0])} y2={sy(secantB[1])} color={R} dash="4 4" />
      <Dot x={sx(secantA[0])} y={sy(secantA[1])} color={C} radius={5} />
      <Dot x={sx(secantB[0])} y={sy(secantB[1])} color={C} radius={5} />
      <Text x={240} y={23} color={C}>secant: rise ÷ run</Text>
    </> : !secant && data.operation === 'derivative' && finite(data.slope) && nearest[0] === x && <><Line x1={sx(x - tangentWidth)} y1={sy(y - data.slope * tangentWidth)} x2={sx(x + tangentWidth)} y2={sy(y + data.slope * tangentWidth)} color={C} width={2.2} /><Text x={Math.min(400, px + 55)} y={Math.max(top + 16, py - 22)} color={C}>slope {fmt(data.slope)}</Text></>}
    {data.operation === 'limit' && <><Arrow x1={px - 45} y1={Math.min(bottom - 13, py + 28)} x2={px - 12} y2={Math.min(bottom - 13, py + 28)} color={B} width={2} /><Arrow x1={px + 45} y1={Math.min(bottom - 13, py + 28)} x2={px + 12} y2={Math.min(bottom - 13, py + 28)} color={B} width={2} /></>}
    <Dot x={px} y={py} color={R} radius={6} hollow={data.operation === 'limit'} />
    <Text x={clamp(px, 85, 395)} y={Math.max(top + 13, py - 13)} color={R}>({fmt(pointX)}, {fmt(y)})</Text>
    {finite(data.result) || !['derivative', 'integral', 'limit'].includes(data.operation) ? <Result y={280}>{integral ? 'signed area = ' : data.operation === 'derivative' ? secant ? 'average rate = ' : 'instantaneous rate = ' : data.operation === 'limit' ? 'approaches ' : 'f(' + fmt(pointX) + ') = '}{fmt(data.result ?? y)}</Result> : <Notice>No numeric {data.operation === 'derivative' ? 'rate' : data.operation === 'integral' ? 'area' : 'limit'} was recorded</Notice>}
  </>;
}

function Probability({ data }) {
  const values = numbers(data.values).slice(0, 12);
  const weights = numbers(data.weights);
  const operation = data.operation;
  if (operation === 'correlation' && Array.isArray(data.points) && data.points.length) {
    const geometry = curveGeometry(data.points);
    if (!geometry) return <Notice y={150}>No paired numeric observations</Notice>;
    const { points, sx, sy, xDomain } = geometry;
    const mx = points.reduce((sum, point) => sum + point[0] / points.length, 0);
    const my = points.reduce((sum, point) => sum + point[1] / points.length, 0);
    const covariance = points.reduce((sum, point) => sum + (point[0] - mx) * (point[1] - my), 0);
    const variance = points.reduce((sum, point) => sum + (point[0] - mx) ** 2, 0);
    const slope = variance ? covariance / variance : 0;
    return <>
      <PlotAxes geometry={geometry} />
      {points.map((point, i) => <Dot key={i} x={sx(point[0])} y={sy(point[1])} color={A} radius={4.5} />)}
      <Line x1={sx(xDomain[0])} y1={sy(my + slope * (xDomain[0] - mx))} x2={sx(xDomain[1])} y2={sy(my + slope * (xDomain[1] - mx))} color={B} width={2} />
      <Result y={280}>r = {fmt(data.result)}</Result>
    </>;
  }
  if ((operation === 'conditional' || operation === 'bayes') && finite(data.result) && data.result >= 0 && data.result <= 1) {
    const p = data.result;
    return <>
      <Text x={240} y={31} color={MUTED}>{operation === 'bayes' ? 'Update the share after the evidence' : 'Measure within the conditioned space'}</Text>
      <rect x={54} y={87} width={372} height={76} fill={B} fillOpacity={.08} stroke={B} />
      <motion.rect initial={false} animate={{ x: 54, y: 87, width: 372 * p, height: 76 }} fill={R} fillOpacity={.26} stroke={R} />
      <Text x={54 + 372 * p / 2} y={128} color={R}>{fmt(p)}</Text>
      {p < .9 && <Text x={54 + 372 * (p + (1 - p) / 2)} y={128} color={B}>{fmt(1 - p)}</Text>}
      <Bracket x={54} y={181} width={372} label="conditioned space = 1" color={B} />
      <Result y={271}>{operation === 'bayes' ? 'posterior' : 'conditional probability'} = {fmt(p)}</Result>
    </>;
  }
  if (!values.length) return <Notice y={145}>No probability observations in this snapshot</Notice>;
  const maxWeight = Math.max(1, ...weights);
  const total = weights.length ? weights.slice(0, values.length).reduce((sum, value) => sum + Math.max(0, value) / maxWeight, 0) : values.length;
  const masses = values.map((_, i) => weights.length ? (Math.max(0, num(weights[i])) / maxWeight) / (total || 1) : 1 / values.length);
  const mean = finite(data.mean) ? data.mean : values.reduce((sum, value, i) => sum + value * masses[i], 0);
  const sx = mathSceneScale(mathSceneDomain(values), 60, 420);
  const highest = Math.max(...masses, .01);
  const barWidth = Math.min(32, 320 / values.length);
  return <>
    <Text x={240} y={25} color={MUTED}>{operation === 'variance' ? 'Spread is distance from the mean' : operation === 'expectation' ? 'Probability mass balances at the expected value' : 'Each outcome carries probability mass'}</Text>
    <Line x1={45} y1={208} x2={438} y2={208} color={MUTED} />
    {values.map((value, i) => {
      const height = masses[i] / highest * 122;
      return <g key={i}>
        <motion.rect initial={false} animate={{ x: sx(value) - barWidth / 2, y: 208 - height, width: barWidth, height }} fill={A} fillOpacity={.22} stroke={A} />
        <Text x={sx(value)} y={198 - height} color={A} className="math-scene__small">{fmt(masses[i])}</Text>
        <Text x={sx(value)} y={231} className="math-scene__small">{short(data.labels?.[i] ?? fmt(value))}</Text>
        {operation === 'variance' && <Line x1={sx(value)} y1={247 + (i % 2) * 4} x2={sx(mean)} y2={247 + (i % 2) * 4} color={C} width={2} />}
      </g>;
    })}
    {['expectation', 'variance'].includes(operation) && <><Line x1={sx(mean)} y1={45} x2={sx(mean)} y2={211} color={R} dash="5 4" width={2} /><Text x={clamp(sx(mean), 90, 390)} y={46} color={R}>mean {fmt(mean)}</Text></>}
    {finite(data.result) && <Result y={283}>{operation === 'variance' ? 'variance = ' : operation === 'expectation' ? 'E[X] = ' : 'result = '}{fmt(data.result)}</Result>}
    {!finite(data.result) && <Notice y={283}>{weights.length ? 'Heights show the supplied relative masses' : 'Equal probability mass for each listed outcome'}</Notice>}
  </>;
}

function Combinatorics({ data }) {
  const n = Math.max(0, Math.floor(num(data.n)));
  const k = clamp(Math.floor(num(data.k)), 0, n);
  const shown = Math.min(n, 10);
  const step = 370 / Math.max(1, shown);
  const choose = data.operation === 'choose';
  return <>
    <Text x={240} y={32} color={MUTED}>{choose ? 'Choose ' + k + ' objects; their order does not matter' : 'Fill each next position with one fewer choice'}</Text>
    {Array.from({ length: shown }, (_, i) => <g key={i}>
      <motion.circle initial={false} animate={{ cx: 55 + (i + .5) * step, cy: 95, r: Math.min(16, step * .36) }} fill={choose && i < k ? R : A} fillOpacity={choose && i < k ? .23 : .1} stroke={choose && i < k ? R : A} strokeWidth={choose && i < k ? 2 : 1} />
      <Text x={55 + (i + .5) * step} y={100} color={choose && i < k ? R : A} className="math-scene__small">{i + 1}</Text>
      {!choose && <><Line x1={55 + i * step + 4} y1={171} x2={55 + (i + 1) * step - 4} y2={171} color={B} width={2} /><Text x={55 + (i + .5) * step} y={157} color={B}>{n - i}</Text><Text x={55 + (i + .5) * step} y={193} color={MUTED} className="math-scene__tiny">choices</Text></>}
    </g>)}
    {choose && <Bracket x={55} y={145} width={Math.min(k, shown) * step} label={k + ' selected'} color={R} />}
    {n > shown && <Notice y={224}>First {shown} of {n} objects shown</Notice>}
    <Result y={264}>{choose ? 'C(' + n + ', ' + k + ')' : n + '!'} = {fmt(data.result)}</Result>
  </>;
}

function Network({ data }) {
  const inputs = numbers(data.inputs).slice(0, 8);
  const outputs = numbers(data.outputs).slice(0, 8);
  const operation = data.operation;
  if (operation === 'batch') {
    const mean = outputs[0];
    const sy = mathSceneScale(mathSceneDomain([...inputs, ...outputs]), 219, 65);
    const step = 360 / Math.max(1, inputs.length);
    return <>
      <Text x={240} y={27} color={MUTED}>One loss from each sample contributes to the mean</Text>
      <Line x1={52} y1={sy(0)} x2={428} y2={sy(0)} color={MUTED} />
      {inputs.map((value, i) => <g key={i}>
        <motion.rect initial={false} animate={{ x: 60 + (i + .15) * step, y: Math.min(sy(0), sy(value)), width: step * .7, height: Math.max(1, Math.abs(sy(value) - sy(0))) }} fill={A} fillOpacity={.23} stroke={A} />
        <Text x={60 + (i + .5) * step} y={sy(value) - 11} color={A} className="math-scene__small">{fmt(value)}</Text>
        <Text x={60 + (i + .5) * step} y={241} color={MUTED} className="math-scene__small">{i + 1}</Text>
      </g>)}
      {finite(mean) && <><motion.line initial={false} animate={{ x1: 53, x2: 427, y1: sy(mean), y2: sy(mean) }} stroke={R} strokeDasharray="5 4" strokeWidth={2} /><Text x={426} y={sy(mean) - 9} anchor="end" color={R}>mean {fmt(mean)}</Text><Result y={281}>batch mean loss = {fmt(mean)}</Result></>}
    </>;
  }
  if (operation === 'loss' && !numbers(data.target).length && inputs.length && outputs.length && inputs[0] > 0 && inputs[0] <= 1) {
    const p = inputs[0];
    const samples = Array.from({ length: 45 }, (_, i) => { const x = 10 ** (-3 + i * 3 / 44); return [x, -Math.log(x)]; });
    samples.push([p, outputs[0]]);
    samples.sort((a, b) => a[0] - b[0]);
    return <><FunctionScene data={{ operation: 'log', points: samples, x: p, result: outputs[0] }} /><Text x={240} y={21} color={MUTED}>Loss = −ln probability of the true class</Text></>;
  }
  if (operation === 'gradient') {
    const sensitivities = outputs.length ? outputs : numbers(data.gradient).slice(0, 8);
    const sx = mathSceneScale(mathSceneDomain(sensitivities), 70, 410);
    const step = 170 / Math.max(1, sensitivities.length);
    return <>
      <Text x={240} y={27} color={MUTED}>Sensitivities: the local rate of change of loss</Text>
      <Line x1={sx(0)} y1={48} x2={sx(0)} y2={234} color={MUTED} dash="4 4" />
      {sensitivities.map((value, i) => {
        const y = 55 + (i + .5) * step;
        return <g key={i}>
          <Text x={44} y={y + 5} color={MUTED} className="math-scene__small">{i}</Text>
          <motion.rect initial={false} animate={{ x: Math.min(sx(0), sx(value)), y: y - 8, width: Math.max(1, Math.abs(sx(value) - sx(0))), height: 16 }} fill={value < 0 ? C : R} fillOpacity={.28} stroke={value < 0 ? C : R} />
          <Text x={clamp(sx(value), 110, 370)} y={y - 14} color={value < 0 ? C : R}>{fmt(value)}</Text>
        </g>;
      })}
      <Notice y={280}>Sign gives the direction; magnitude gives the sensitivity</Notice>
    </>;
  }
  if (operation === 'relu') {
    const domain = mathSceneDomain([...inputs, ...outputs, 0]);
    const sx = mathSceneScale(domain, 65, 415);
    const count = Math.max(inputs.length, outputs.length);
    return <>
      <Line x1={sx(0)} y1={40} x2={sx(0)} y2={231} color={C} width={2} dash="5 4" />
      <Text x={sx(0)} y={26} color={C}>0 gate</Text>
      {Array.from({ length: count }, (_, i) => {
        const y = 61 + i * (160 / Math.max(1, count - 1));
        return <g key={i}><Line x1={65} y1={y} x2={415} y2={y} /><Arrow x1={sx(num(inputs[i]))} y1={y} x2={sx(num(outputs[i]))} y2={y} color={num(inputs[i]) < 0 ? C : R} width={2} /><Dot x={sx(num(inputs[i]))} y={y} color={A} radius={5} /><Dot x={sx(num(outputs[i]))} y={y} color={R} radius={5} /><Text x={51} y={y + 5} anchor="end" color={A}>{fmt(inputs[i])}</Text><Text x={429} y={y + 5} anchor="start" color={R}>{fmt(outputs[i])}</Text></g>;
      })}
      <Notice y={280}>Negative inputs stop at zero; positive inputs keep their value</Notice>
    </>;
  }
  if (operation === 'softmax') {
    const count = Math.max(inputs.length, outputs.length);
    const step = 360 / Math.max(1, count);
    return <>
      <Text x={240} y={27} color={MUTED}>Scores share one unit of probability mass</Text>
      {outputs.map((value, i) => <g key={i}>
        <Text x={60 + (i + .5) * step} y={62} color={A}>{fmt(inputs[i])}</Text>
        <Arrow x1={60 + (i + .5) * step} y1={77} x2={60 + (i + .5) * step} y2={102} color={MUTED} width={1} />
        <motion.rect initial={false} animate={{ x: 60 + i * step + step * .15, y: 224 - clamp(value, 0, 1) * 116, width: step * .7, height: clamp(value, 0, 1) * 116 }} fill={R} fillOpacity={.24} stroke={R} />
        <Text x={60 + (i + .5) * step} y={247} color={R} className="math-scene__small">{fmt(value)}</Text>
      </g>)}
      <Notice y={282}>Σ probabilities = {fmt(outputs.reduce((sum, value) => sum + value, 0))}</Notice>
    </>;
  }
  if (['loss', 'update'].includes(operation)) {
    const target = numbers(operation === 'loss' ? data.target : data.previous);
    const before = target.length ? target : inputs;
    const domain = mathSceneDomain([...before, ...outputs]);
    const sx = mathSceneScale(domain, 65, 415);
    const count = Math.min(6, Math.max(before.length, outputs.length));
    return <>
      <Text x={240} y={27} color={MUTED}>{operation === 'loss' ? 'Loss measures prediction error' : 'Move against the gradient to reduce the loss'}</Text>
      {Array.from({ length: count }, (_, i) => {
        const y = 65 + i * (155 / Math.max(1, count - 1));
        const old = num(before[i]), after = num(outputs[i]);
        return <g key={i}>
          <Line x1={65} y1={y} x2={415} y2={y} />
          <Arrow x1={sx(old)} y1={y} x2={sx(after)} y2={y} color={operation === 'loss' ? C : R} width={2} />
          <Dot x={sx(old)} y={y} color={operation === 'loss' ? B : A} radius={5} />
          <Dot x={sx(after)} y={y} color={R} radius={5} />
          <Text x={51} y={y + 5} anchor="end" color={operation === 'loss' ? B : A}>{fmt(old)}</Text>
          <Text x={429} y={y + 5} anchor="start" color={R}>{fmt(after)}</Text>
        </g>;
      })}
      <Notice y={281}>{operation === 'loss' ? 'Blue target · magenta prediction · ochre distance' : 'η = ' + fmt(data.learningRate) + ' · new = previous − η × gradient'}</Notice>
    </>;
  }
  const weights = Array.isArray(data.weights) ? data.weights : [];
  const maxIn = Math.max(1, inputs.length), maxOut = Math.max(1, outputs.length);
  const inRadius = Math.min(20, 84 / maxIn - 2);
  const outRadius = Math.min(23, 84 / maxOut - 2);
  const inY = i => 52 + (i + .5) * 168 / maxIn;
  const outY = i => 52 + (i + .5) * 168 / maxOut;
  return <>
    {inputs.map((value, i) => outputs.map((output, j) => {
      const knownWeight = finite(weights[i]?.[j]);
      const weight = num(weights[i]?.[j]);
      return <g key={i + '-' + j}>
        <Line x1={96 + inRadius} y1={inY(i)} x2={373 - outRadius} y2={outY(j)} color={knownWeight ? weight < 0 ? C : B : MUTED} width={knownWeight ? clamp(Math.abs(weight), .6, 3) : 1} dash={weight < 0 ? '5 4' : undefined} opacity={.45} />
        {knownWeight && inputs.length * outputs.length <= 9 && <Text x={216 + (i % 2) * 30} y={(inY(i) + outY(j)) / 2 - 6} color={weight < 0 ? C : B} className="math-scene__small">{fmt(weight)}</Text>}
      </g>;
    }))}
    {inputs.map((value, i) => <g key={'i' + i}><circle cx={96} cy={inY(i)} r={inRadius} fill={A} fillOpacity={.12} stroke={A} /><Text x={maxIn > 4 ? 78 : 96} y={inY(i) + 5} anchor={maxIn > 4 ? 'end' : 'middle'} color={A}>{fmt(value)}</Text></g>)}
    {outputs.map((value, i) => <g key={'o' + i}><motion.circle initial={false} animate={{ cx: 373, cy: outY(i), r: outRadius }} fill={R} fillOpacity={.14} stroke={R} strokeWidth={2} /><Text x={maxOut > 4 ? 391 : 373} y={outY(i) + 5} anchor={maxOut > 4 ? 'start' : 'middle'} color={R}>{fmt(value)}</Text>{finite(data.bias?.[i]) && maxOut <= 4 && <Text x={420} y={outY(i) + 5} color={C} className="math-scene__small">+{fmt(data.bias[i])}</Text>}</g>)}
    <Text x={96} y={29} color={A}>{operation === 'batch' ? 'samples' : 'inputs'}</Text>
    <Text x={373} y={29} color={R}>{operation === 'batch' ? 'aggregate' : 'weighted sum'}</Text>
    <Notice y={279}>{operation === 'batch' ? 'The output combines this batch of recorded values' : weights.length ? 'Each connection contributes input × weight, then bias is added' : 'Recorded inputs and outputs; weights were not captured'}</Notice>
  </>;
}

function Collections({ data }) {
  const arrays = Array.isArray(data.arrays) ? data.arrays.slice(0, 3) : [];
  const scalars = Array.isArray(data.scalars) ? data.scalars.slice(0, arrays.length ? 1 : 5) : [];
  const changed = Array.isArray(data.changed) ? data.changed : [];
  const width = 400 / Math.max(1, arrays.length);
  return <>
    {arrays.map((item, index) => {
      const matrix = Array.isArray(item.values?.[0]);
      const rows = matrix ? item.values : [item.values];
      const count = matrix ? Math.max(1, ...rows.map(row => row.length)) : item.values?.length || 1;
      const cell = Math.min(34, (width - 20) / Math.min(count, 4));
      const x = 40 + index * width + (width - Math.min(count, 4) * cell) / 2;
      const color = changed.includes(item.name) ? R : index === 1 ? B : A;
      if (!matrix && count > 4) {
        const values = numbers(item.values).slice(0, 8);
        const sx = mathSceneScale(mathSceneDomain(values), 181, 78);
        const step = (width - 16) / Math.max(1, values.length);
        return <g key={item.name}>
          <Text x={40 + (index + .5) * width} y={47} color={color}>{short(item.name)}</Text>
          <Line x1={40 + index * width + 8} y1={sx(0)} x2={40 + (index + 1) * width - 8} y2={sx(0)} color={MUTED} />
          {values.map((value, i) => <g key={i}><motion.rect initial={false} animate={{ x: 48 + index * width + i * step + step * .15, y: Math.min(sx(value), sx(0)), width: step * .7, height: Math.max(1, Math.abs(sx(value) - sx(0))) }} fill={color} fillOpacity={.25} /><Text x={48 + index * width + (i + .5) * step} y={sx(value) - 7} color={color} className="math-scene__tiny">{fmt(value)}</Text></g>)}
          <Text x={40 + (index + .5) * width} y={210} color={MUTED} className="math-scene__small">{count} values{count > values.length ? ' · first ' + values.length + ' shown' : ''}</Text>
        </g>;
      }
      return <g key={item.name}><MatrixGrid values={rows} x={x} y={72} cell={cell} color={color} name={short(item.name)} row={changed.includes(item.name) ? 0 : undefined} /><Text x={40 + (index + .5) * width} y={225} color={MUTED} className="math-scene__small">{matrix ? rows.length + ' × ' + count : count + ' components'}{rows.length > 4 || count > 4 ? ' · first 4 × 4 shown' : ''}</Text></g>;
    })}
    {scalars.map((item, index) => <Text key={item.name} x={240} y={arrays.length ? 259 : 74 + index * 33} color={changed.includes(item.name) ? R : INK}>{short(item.name)} = {fmt(item.value)}</Text>)}
    {!arrays.length && !scalars.length && <Notice y={145}>No numeric values were recorded at this step</Notice>}
    {(data.arrays?.length > arrays.length || data.scalars?.length > scalars.length) && <Notice>Additional recorded values remain in the exact snapshot</Notice>}
  </>;
}

function Relation({ data }) {
  const values = numbers(data.values).slice(0, 8);
  const domain = mathSceneDomain(values);
  const sx = mathSceneScale(domain, 60, 420);
  return <>
    {values.length > 0 ? <>
      <Axis domain={domain} x={60} end={420} y={205} />
      {values.map((value, index) => <g key={index}>
        <Line x1={sx(value)} y1={78 + (index % 3) * 38} x2={sx(value)} y2={205} color={[A, B, C][index % 3]} dash="4 4" />
        <Dot x={sx(value)} y={78 + (index % 3) * 38} color={[A, B, C][index % 3]} radius={6} label={(data.labels?.[index] ? short(data.labels[index]) + ' = ' : '') + fmt(value)} />
      </g>)}
    </> : <Text x={240} y={127} color={A}>{(data.labels || []).slice(0, 5).map(short).join('  ·  ')}</Text>}
    <Result>{str(data.operation)}{data.result !== undefined ? ' = ' + str(data.result) : ''}</Result>
  </>;
}

const renderers = {
  comparison: Comparison, arithmetic: Arithmetic, sequence: Sequence,
  vector: Vector, matrix: Matrix, sets: Sets, function: FunctionScene,
  probability: Probability, combinatorics: Combinatorics,
  network: Network, collections: Collections, relation: Relation,
};

function hasNumericGeometry(kind, data) {
  if (kind === 'comparison') return finite(data.a) && finite(data.b);
  if (kind === 'arithmetic') return finite(data.a) && finite(data.result);
  if (kind === 'sequence') return numbers(data.values).length > 0 && finite(data.accumulator);
  if (kind === 'vector') return numbers(data.a).length > 0;
  if (kind === 'matrix') return Array.isArray(data.a?.[0]) && numbers(data.a[0]).length > 0;
  if (kind === 'combinatorics') return finite(data.n);
  if (kind === 'network') return numbers(data.inputs).length > 0 || numbers(data.outputs).length > 0;
  return true;
}

function exactDescription(scene) {
  // JSON is text only. React escapes all labels; neither SVG nor a source string
  // is ever inserted as HTML. Keep full precision here when labels are shortened.
  let values = '';
  try { values = JSON.stringify(scene.data); } catch { values = 'Preview unavailable'; }
  return [scene.description, scene.formulaText, 'Exact scene values: ' + values].filter(Boolean).join('. ');
}

export function MathTraceScene({ scene }) {
  const id = 'math-scene-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!scene || !scene.data) return null;
  const hasGeometry = hasNumericGeometry(scene.kind, scene.data);
  const Renderer = hasGeometry ? renderers[scene.kind] || Collections : Relation;
  const data = hasGeometry ? scene.data : { operation: '', values: [], labels: [scene.formulaText || scene.title || 'Mathematical rule'], result: undefined };
  return <MotionConfig reducedMotion="user" transition={{ duration: .38, ease: [.2, .7, .2, 1] }}>
    <figure className={'math-scene math-scene--' + scene.kind} data-math-scene={scene.kind} data-scene-stage={scene.stage}>
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-labelledby={id + '-title ' + id + '-description'} focusable="false">
        <title id={id + '-title'}>{scene.title || 'Mathematical state'}</title>
        <desc id={id + '-description'}>{exactDescription(scene)}</desc>
        <Renderer data={data} />
      </svg>
    </figure>
  </MotionConfig>;
}

export default MathTraceScene;
