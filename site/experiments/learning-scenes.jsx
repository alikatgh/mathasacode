import React, { useId, useState } from 'react';
import { Button } from '../components/ui/button';
import { ExperimentFrame, Metric, RangeControl } from './scene-ui.jsx';
import {
  bayesNaturalFrequencies, gradientLoss, gradientCandidate, createGradientRun,
  advanceGradientRun, MAX_GRADIENT_UPDATES, weightedSumCalculation, softmaxCalculation,
} from './learning-scene-model.mjs';

const words = (language, en, zh) => language === 'zh' ? zh : en;
const n = (value, digits = 3) => Number(value.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });
const pair = values => `[${values.map(value => n(value)).join(', ')}]`;
const ink = { a: 'var(--scene-a)', b: 'var(--scene-b)', c: 'var(--scene-c)', grid: 'var(--scene-grid)' };
const svgText = { fontSize: 18, fontFamily: 'inherit', fill: 'currentColor' };

function BayesScene({ language = 'en' }) {
  const [step, setStep] = useState(0);
  const [prior, setPrior] = useState(1);
  const data = bayesNaturalFrequencies(prior);
  const t = (en, zh) => words(language, en, zh);
  const targetWidth = 280 * data.prior;
  const posteriorWidth = 280 * data.posterior;
  const steps = [
    t('Start with 10,000 cases. Each tile represents 100 expected cases.', '从 10,000 个案例开始。每个小格表示 100 个预期案例。'),
    t('Use the prior to separate cases with the target from all other cases.', '用先验概率，把目标案例与其余案例分开。'),
    t('A signal appears in 90% of target cases, but also in 5% of other cases.', '90% 的目标案例产生信号，但其余案例中也有 5% 产生信号。'),
    t('Keep only signal cases. The target share within this smaller population is the posterior.', '只保留产生信号的案例。这个较小群体中目标案例的比例就是后验概率。'),
  ];
  return <ExperimentFrame
    language={language}
    title={t('Count before you condition', '先计数，再求条件概率')}
    description={t('A rare target can produce fewer true signals than the much larger non-target population produces false signals.', '当目标很少见时，真正的信号数量可能少于庞大的非目标群体产生的假信号。')}
    caption={t('Areas show expected counts. Fractional counts are averages over repeated populations, not fractions of a person.', '面积表示预期数量。非整数是重复抽样的平均值，并不表示半个人。')}
    controls={<RangeControl label={t('Prior target share (%)', '目标的先验比例（%）')} value={prior} min={1} max={50} step={1} onChange={setPrior} />}
    readout={<>
      <div className="scene-metrics">
        <Metric label={t('Population', '总案例')} value="10,000" />
        {step >= 1 && <Metric label={t('Target cases', '目标案例')} value={n(data.target)} />}
        {step >= 2 && <><Metric label={t('True signals', '真信号')} value={n(data.trueSignals)} /><Metric label={t('False signals', '假信号')} value={n(data.falseSignals)} /></>}
        {step === 3 && <Metric label={t('Target given a signal', '出现信号时属于目标的概率')} value={`${n(data.posterior * 100, 2)}%`} />}
      </div>
      {step >= 2 && <p className="scene-equation">{n(data.trueSignals)} + {n(data.falseSignals)} = {n(data.totalSignals)} {t('signals', '个信号')}</p>}
      {step === 3 && <p className="scene-equation">P({t('target | signal', '目标 | 信号')}) = {n(data.trueSignals)} / {n(data.totalSignals)} = {n(data.posterior * 100, 2)}%</p>}
      <p className="scene-note">{t('Sensitivity stays at 90%; false-positive rate stays at 5%. All counts are expected counts per 10,000 cases.', '灵敏度固定为 90%；假阳性率固定为 5%。所有数量均为每 10,000 个案例的预期值。')}</p>
    </>}
    steps={steps} step={step} onStep={setStep}
  >
    <svg viewBox="0 0 360 260" role="img" aria-label={steps[step]}>
      {step === 0 ? <g>{Array.from({ length: 100 }, (_, index) => <rect key={index} x={40 + (index % 10) * 28 + 1} y={35 + Math.floor(index / 10) * 18 + 1} width="26" height="16" fill={ink.grid} />)}</g> : step < 3 ? <g>
        <rect x="40" y="35" width={targetWidth} height="180" fill={ink.a} fillOpacity={step === 1 ? 0.7 : 0.2} />
        <rect x={40 + targetWidth} y="35" width={280 - targetWidth} height="180" fill={ink.grid} />
        {step === 2 && <>
          <rect x="40" y="53" width={targetWidth} height="162" fill={ink.a} />
          <rect x={40 + targetWidth} y="206" width={280 - targetWidth} height="9" fill={ink.b} />
          <line x1="40" x2="320" y1="206" y2="206" stroke="currentColor" strokeOpacity="0.25" />
        </>}
        <rect x="40" y="35" width="280" height="180" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      </g> : <g>
        <text x="180" y="56" textAnchor="middle" style={svgText}>{t('Signals only', '只看信号')}</text>
        <rect x="40" y="80" width={posteriorWidth} height="100" fill={ink.a} />
        <rect x={40 + posteriorWidth} y="80" width={280 - posteriorWidth} height="100" fill={ink.b} />
        <rect x="40" y="80" width="280" height="100" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <text x="180" y="215" textAnchor="middle" style={svgText}>{n(data.posterior * 100, 2)}% {t('target', '属于目标')}</text>
      </g>}
      {step < 3 && <text x="180" y="246" textAnchor="middle" style={svgText}>{t('All 10,000 cases', '全部 10,000 个案例')}</text>}
      {step >= 1 && <g>
        <rect x="40" y="8" width="12" height="12" fill={ink.a} />
        <text x="60" y="21" style={svgText}>{t(step === 1 ? 'Target' : 'True', step === 1 ? '目标' : '真信号')}</text>
        {step >= 2 && <><rect x="214" y="8" width="12" height="12" fill={ink.b} /><text x="234" y="21" style={svgText}>{t('False', '假信号')}</text></>}
      </g>}
    </svg>
  </ExperimentFrame>;
}

function GradientScene({ language = 'en' }) {
  const [step, setStep] = useState(0);
  const [eta, setEta] = useState(0.5);
  const [run, setRun] = useState(createGradientRun);
  const arrowId = `gradient-arrow-${useId().replace(/:/g, '')}`;
  const clipId = `${arrowId}-clip`;
  const t = (en, zh) => words(language, en, zh);
  const candidate = gradientCandidate(run.weights, eta);
  const loss = gradientLoss(run.weights);
  const canAccept = step === 3 && eta > 0 && run.updates < MAX_GRADIENT_UPDATES && loss >= 1e-12;
  const xy = ([x, y]) => [80 + (x + 3) * 20, 220 - (y + 1) * 20];
  const [x, y] = xy(run.weights);
  const direction = run.weights.map((value, index) => value - candidate.gradient[index]);
  const [endX, endY] = xy(step === 1 ? direction : candidate.weights);
  const steps = [
    t('Inspect the current weights and their loss. Each contour connects points with equal loss.', '观察当前权重和损失。每条等高线连接损失相等的点。'),
    t('Compute the gradient, then point in its negative direction: toward lower loss.', '计算梯度，再沿其反方向指向损失更低的位置。'),
    t('Multiply the negative gradient by the learning rate η. This gives the proposed displacement.', '将负梯度乘以学习率 η，得到这一步的候选位移。'),
    t('Evaluate the candidate. Accept it to update both weights together, then recompute the gradient.', '计算候选点的损失。接受后同时更新两个权重，再重新计算梯度。'),
  ];
  const accept = () => { setRun(current => advanceGradientRun(current, eta)); setStep(0); };
  return <ExperimentFrame
    language={language}
    title={t('A gradient step on the loss surface', '在损失曲面上走一步')}
    description={t('Two samples: x₁ = [1, 0], y₁ = 2; x₂ = [0, 1], y₂ = 4. Both weights are updated from the same current point.', '两个样本：x₁ = [1, 0]，y₁ = 2；x₂ = [0, 1]，y₂ = 4。两个权重都根据同一个当前点更新。')}
    caption={t('Contours use equal scales on both axes. The trail contains accepted updates; the outlined point is a preview.', '两个坐标轴使用相同刻度。轨迹只包含已接受的更新；空心点是候选位置。')}
    controls={<>
      <RangeControl label={t('Learning rate η', '学习率 η')} value={eta} min={0} max={3.5} step={0.1} onChange={setEta} />
      <div className="scene-actions">
        <Button type="button" variant="outline" size="sm" disabled={!canAccept} onClick={accept}>{t('Accept update', '接受这一步')}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setRun(createGradientRun()); setStep(0); }}>{t('Reset weights', '重置权重')}</Button>
      </div>
      <p className="scene-note">{t(`${run.updates} of ${MAX_GRADIENT_UPDATES} updates accepted.`, `已接受 ${run.updates} 步，最多 ${MAX_GRADIENT_UPDATES} 步。`)} {run.updates === MAX_GRADIENT_UPDATES ? t('Reset to start another run.', '请重置后再次尝试。') : loss < 1e-12 ? t('The minimum has been reached to numerical tolerance.', '已在数值精度范围内到达最小值。') : eta === 0 ? t('η = 0 leaves the weights unchanged.', 'η = 0 时权重不变。') : step < 3 ? t('Inspect all four stages to accept the candidate.', '观察四个阶段后即可接受候选点。') : ''}</p>
    </>}
    readout={<>
      <p className="scene-equation">L = ((w₀ − 2)² + (w₁ − 4)²) / 4</p>
      <div className="scene-metrics"><Metric label={t('Current weights', '当前权重')} value={pair(run.weights)} /><Metric label={t('Current loss', '当前损失')} value={n(loss, 6)} />{step >= 1 && <Metric label="∇L" value={pair(candidate.gradient)} />}{step >= 2 && <Metric label="−η∇L" value={pair(candidate.delta)} />}{step === 3 && <><Metric label={t('Candidate weights', '候选权重')} value={pair(candidate.weights)} /><Metric label={t('Candidate loss', '候选损失')} value={n(candidate.loss, 6)} /></>}</div>
      {step >= 2 && <p className="scene-equation">w′ = {pair(run.weights)} − {n(eta)} × {pair(candidate.gradient)} = {pair(candidate.weights)}</p>}
    </>}
    steps={steps} step={step} onStep={setStep}
  >
    <svg viewBox="0 0 360 260" role="img" aria-label={steps[step]}>
      <defs><clipPath id={clipId}><rect x="80" y="20" width="200" height="200" /></clipPath><marker id={arrowId} markerWidth="8" markerHeight="8" refX="7" refY="4" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L8,4 L0,8" fill={ink.b} /></marker></defs>
      <g clipPath={`url(#${clipId})`}>
        {[0.25, 1, 2.5, 5, 10].map(level => <circle key={level} cx="180" cy="120" r={Math.sqrt(4 * level) * 20} fill="none" stroke={ink.grid} strokeWidth="1.5" />)}
        <line x1="80" x2="280" y1="200" y2="200" stroke="currentColor" strokeOpacity="0.45" />
        <line x1="140" x2="140" y1="20" y2="220" stroke="currentColor" strokeOpacity="0.45" />
        <polyline points={run.trail.map(point => xy(point).join(',')).join(' ')} fill="none" stroke={ink.a} strokeWidth="2" strokeOpacity="0.65" />
        {run.trail.slice(0, -1).map((point, index) => <circle key={index} cx={xy(point)[0]} cy={xy(point)[1]} r="2.5" fill={ink.a} />)}
        <path d="M174,120 H186 M180,114 V126" stroke="currentColor" strokeWidth="2" />
        {step >= 1 && Math.hypot(endX - x, endY - y) > 0.01 && <line x1={x} y1={y} x2={endX} y2={endY} stroke={ink.b} strokeWidth="2.5" markerEnd={`url(#${arrowId})`} />}
        {step >= 2 && <circle cx={xy(candidate.weights)[0]} cy={xy(candidate.weights)[1]} r="7" fill="none" stroke={ink.b} strokeWidth="2" />}
        <circle cx={x} cy={y} r="5" fill={ink.a} />
      </g>
      <text x="289" y="207" style={svgText}>w₀</text><text x="129" y="18" style={svgText}>w₁</text>
      <text x="140" y="241" textAnchor="middle" style={svgText}>0</text><text x="180" y="241" textAnchor="middle" style={svgText}>2</text><text x="220" y="241" textAnchor="middle" style={svgText}>4</text>
      <text x="56" y="127" style={svgText}>4</text><text x="56" y="47" style={svgText}>8</text>
      <text x="193" y="112" style={svgText}>{t('min', '最小值')}</text>
      {step === 3 && <text x="345" y="30" textAnchor="end" style={{ ...svgText, fill: ink.b }}>L′ = {n(candidate.loss, 4)}</text>}
    </svg>
  </ExperimentFrame>;
}

function WeightedSumsScene({ language = 'en' }) {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState([1, 1]);
  const data = weightedSumCalculation(inputs);
  const t = (en, zh) => words(language, en, zh);
  const steps = [
    t('Send both input values to both units. Each connection has its own weight.', '把两个输入值都送到两个单元。每条连接都有自己的权重。'),
    t('Multiply each input by the weight on its connection. Keep all four contributions.', '将每个输入乘以对应连接的权重，保留四个贡献值。'),
    t('Add the two incoming contributions separately for each unit.', '分别把每个单元收到的两个贡献值相加。'),
    t('Add each unit’s bias of −0.2. These are the values of a = xW₁ + b₁, before any activation.', '每个单元再加上偏置 −0.2。这就是 a = xW₁ + b₁ 的结果，尚未应用激活函数。'),
  ];
  const changeInput = (index, value) => setInputs(current => current.map((item, i) => i === index ? value : item));
  return <ExperimentFrame
    language={language}
    title={t('Inside a weighted sum', '加权和的内部步骤')}
    description={t('Follow each contribution through a two-input, two-unit layer. Changing either input changes both units.', '追踪一个双输入、双单元层中的每个贡献值。改变任一输入，两个单元都会变化。')}
    caption={t('Connection labels first show weights, then products. There is no ReLU in this calculation.', '连接标签先显示权重，再显示乘积。此处尚未计算 ReLU。')}
    controls={<>{inputs.map((value, index) => <RangeControl key={index} label={`${t('Input', '输入')} x${index === 0 ? '₀' : '₁'}`} value={value} min={-2} max={2} step={0.1} onChange={next => changeInput(index, next)} />)}</>}
    readout={<>
      <p className="scene-equation">x = {pair(inputs)} ; W₁ = [[0.5, −0.5], [0.5, −0.5]]</p>
      {step >= 1 && <div className="scene-metrics">{[0, 1].map(unit => <Metric key={unit} label={`${t('Unit', '单元')} ${unit}`} value={`${n(inputs[0])} × ${n(data.weights[0][unit])} + ${n(inputs[1])} × ${n(data.weights[1][unit])}${step >= 2 ? ` = ${n(data.sums[unit])}` : ''}`} />)}</div>}
      {step >= 1 && <p className="scene-equation">{t('Contributions', '各连接的贡献')} → {pair(data.contributions[0])} ; {pair(data.contributions[1])}</p>}
      {step >= 2 && <p className="scene-equation">xW₁ = {pair(data.sums)}</p>}
      {step === 3 && <p className="scene-equation">a = {pair(data.sums)} + [−0.2, −0.2] = {pair(data.activations)}</p>}
    </>}
    steps={steps} step={step} onStep={setStep}
  >
    <svg viewBox="0 0 360 260" role="img" aria-label={steps[step]}>
      {[0, 1].flatMap(input => [0, 1].map(unit => <line key={`${input}-${unit}`} x1="69" y1={input ? 200 : 60} x2="286" y2={unit ? 200 : 60} stroke={unit ? ink.b : ink.a} strokeWidth="2" strokeOpacity={step === 0 ? 0.3 : 0.8} />))}
      {[[0, 0, 177, 43], [1, 1, 177, 236], [0, 1, 121, 122], [1, 0, 121, 155]].map(([input, unit, x, y]) => <text key={`${input}-${unit}`} x={x} y={y} textAnchor="middle" style={{ ...svgText, fill: unit ? ink.b : ink.a, paintOrder: 'stroke', stroke: 'var(--background)', strokeWidth: 5, strokeLinejoin: 'round' }}>{step === 0 ? `×${n(data.weights[input][unit])}` : n(data.contributions[unit][input])}</text>)}
      {[0, 1].map(input => <g key={input}><circle cx="45" cy={input ? 200 : 60} r="24" fill={ink.c} fillOpacity="0.15" stroke={ink.c} strokeWidth="2" /><text x="45" y={input ? 206 : 66} textAnchor="middle" style={svgText}>{n(inputs[input])}</text><text x="45" y={input ? 244 : 104} textAnchor="middle" style={svgText}>x{input ? '₁' : '₀'}</text></g>)}
      {[0, 1].map(unit => <g key={unit}>
        <circle cx="310" cy={unit ? 200 : 60} r="26" fill={unit ? ink.b : ink.a} fillOpacity="0.12" stroke={unit ? ink.b : ink.a} strokeWidth="2" />
        <text x="310" y={unit ? 206 : 66} textAnchor="middle" style={svgText}>{step >= 2 ? n(step === 3 ? data.activations[unit] : data.sums[unit]) : 'Σ'}</text>
        <text x="310" y={unit ? 244 : 104} textAnchor="middle" style={svgText}>{step === 3 ? `a${unit ? '₁' : '₀'}` : `${t('unit', '单元')} ${unit}`}</text>
        {step === 3 && <text x="310" y={unit ? 160 : 20} textAnchor="middle" style={svgText}>−0.2</text>}
      </g>)}
    </svg>
  </ExperimentFrame>;
}

function SoftmaxScene({ language = 'en' }) {
  const [step, setStep] = useState(0);
  const [gap, setGap] = useState(0.6);
  const data = softmaxCalculation(gap);
  const t = (en, zh) => words(language, en, zh);
  const values = [data.logits, data.shifted, data.exponentials, data.probabilities][step];
  const units = [t('Raw scores', '原始分数'), t('Shifted scores', '平移后的分数'), t('Exponentials', '指数值'), t('Probabilities', '概率')];
  const steps = [
    t('Start with two raw scores. Their difference controls the relative preference.', '从两个原始分数开始。它们的差值决定相对偏好。'),
    t('Subtract the largest score from both scores. The preference stays the same; the largest shifted score is zero.', '两个分数都减去最大值。相对偏好不变，平移后的最大分数为零。'),
    t('Exponentiate each shifted score. Every result is positive and at most one.', '对每个平移后的分数取指数。所有结果均为正数，且不超过一。'),
    t('Divide each exponential by their sum. The resulting probabilities add up to one.', '每个指数值都除以它们的总和，得到总和为一的概率。'),
  ];
  return <ExperimentFrame
    language={language}
    title={t('Turn scores into probabilities', '把分数变成概率')}
    description={t('Softmax preserves the score ordering while producing a normalized distribution. Subtracting the maximum keeps the exponentials bounded.', 'Softmax 保留分数排序，同时得到归一化的概率分布。减去最大值能让指数值保持有界。')}
    caption={t('Scores use a zero baseline and can be negative. Exponentials and probabilities use a 0-to-1 scale.', '分数以零为基线，可以为负数。指数值和概率使用 0 到 1 的刻度。')}
    controls={<RangeControl label={t('Score gap z₀ − z₁', '分数差 z₀ − z₁')} value={gap} min={-6} max={6} step={0.1} onChange={setGap} />}
    readout={<>
      <div className="scene-metrics"><Metric label={units[step]} value={pair(values)} />{step >= 2 && <Metric label={t('Exponential sum', '指数值之和')} value={n(data.denominator, 6)} />}{step === 3 && <Metric label={t('Probability total', '概率总和')} value={n(data.total, 6)} />}</div>
      {step === 0 && <p className="scene-equation">z = [{n(gap)} / 2, −({n(gap)}) / 2] = {pair(data.logits)}</p>}
      {step === 1 && <p className="scene-equation">z − max(z) = {pair(data.logits)} − {n(data.maximum)} = {pair(data.shifted)}</p>}
      {step === 2 && <p className="scene-equation">exp({pair(data.shifted)}) = [{data.exponentials.map(value => n(value, 6)).join(', ')}]</p>}
      {step === 3 && <p className="scene-equation">p = [{data.exponentials.map(value => n(value, 6)).join(', ')}] / {n(data.denominator, 6)} = [{data.probabilities.map(value => n(value, 6)).join(', ')}]</p>}
    </>}
    steps={steps} step={step} onStep={setStep}
  >
    <svg viewBox="0 0 360 260" role="img" aria-label={steps[step]}>
      {[0, 1].map(index => {
        const y = index ? 162 : 68;
        const baseline = step < 2 ? 195 : 85;
        const scale = step < 2 ? 22 : 235;
        const end = baseline + values[index] * scale;
        return <g key={index}>
          <text x="42" y={y + 25} textAnchor="middle" style={svgText}>{step === 3 ? 'p' : step === 2 ? 'e' : 'z'}{index ? '₁' : '₀'}</text>
          <line x1={step < 2 ? 63 : 85} x2="327" y1={y + 42} y2={y + 42} stroke={ink.grid} />
          {values[index] === 0 ? <circle cx={baseline} cy={y + 20} r="4" fill={index ? ink.b : ink.a} /> : <rect x={Math.min(baseline, end)} y={y} width={Math.abs(end - baseline)} height="40" fill={index ? ink.b : ink.a} />}
          <text x="327" y={y - 10} textAnchor="end" style={svgText}>{step === 3 ? `${n(values[index] * 100, 2)}%` : n(values[index], step === 2 ? 6 : 3)}</text>
        </g>;
      })}
      <line x1={step < 2 ? 195 : 85} x2={step < 2 ? 195 : 85} y1="51" y2="205" stroke="currentColor" strokeOpacity="0.5" />
      <text x={step < 2 ? 195 : 85} y="232" textAnchor="middle" style={svgText}>0</text>
      {step >= 2 && <text x="320" y="232" textAnchor="middle" style={svgText}>1</text>}
      <text x="180" y="256" textAnchor="middle" style={svgText}>{units[step]}</text>
    </svg>
  </ExperimentFrame>;
}

export const learningExperiments = {
  bayes: { title: { en: 'Bayes: count the signals', zh: '贝叶斯：计算信号数量' }, Component: BayesScene },
  gradient: { title: { en: 'Gradient descent: follow the slope', zh: '梯度下降：沿斜率前进' }, Component: GradientScene },
  'ml-weighted-sums': { title: { en: 'Weighted sums: follow every input', zh: '加权和：追踪每个输入' }, Component: WeightedSumsScene },
  'ml-softmax-normalization': { title: { en: 'Softmax: normalize the scores', zh: 'Softmax：归一化分数' }, Component: SoftmaxScene },
};
