import React, { useId, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { ExperimentFrame, Metric, RangeControl, SvgHandle } from './scene-ui.jsx';
import {
  TRAINING_INPUTS, TRAINING_LABELS, MAX_TRAINING_STEPS, makeNeuralNetwork,
  reluCalculation, neuralForward, neuralBackward, neuralFiniteDifference,
  neuralTrainingHistory, neuralProbabilityGrid, neuralMeanGradients,
} from './neural-lab-model.mjs';

const words = (language, en, zh) => language === 'zh' ? zh : en;
const n = (value, digits = 3) => Number(value.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });
const pair = values => `[${values.map(value => n(value)).join(', ')}]`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = value => Math.round(value * 100) / 100;
const ink = { a: 'var(--scene-a)', b: 'var(--scene-b)', c: 'var(--scene-c)', grid: 'var(--scene-grid)' };
const text = { fontSize: 18, fontFamily: 'inherit', fill: 'currentColor' };
const halo = { ...text, paintOrder: 'stroke', stroke: 'var(--background)', strokeWidth: 4, strokeLinejoin: 'round' };
const initialNetwork = makeNeuralNetwork();

function ReluLab({ language = 'en' }) {
  const t = (en, zh) => words(language, en, zh);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([0.8, -1.2]);
  const [selected, setSelected] = useState(0);
  const calculations = values.map(reluCalculation);
  const current = calculations[selected];
  const unit = selected ? '₁' : '₀';
  const x = value => 180 + value * 67;
  const y = value => 198 - value * 67;
  const setValue = value => setValues(old => old.map((item, index) => index === selected ? round(clamp(value, -2, 2)) : item));
  const steps = [
    t('Start with the saved preactivations a = [0.8, −1.2]. Select either unit, then drag its point along the input axis.', '从保存的预激活值 a = [0.8, −1.2] 开始。选择任一单元，再沿输入轴拖动它的点。'),
    t(`Compare a${unit} = ${n(current.input)} with zero. Its current branch is ${current.input > 0 ? 'positive: keep the input' : 'non-positive: use zero'}.`, `将 a${unit} = ${n(current.input)} 与零比较。它当前走${current.input > 0 ? '正数分支：保留输入' : '非正数分支：输出零'}。`),
    t(`Apply the branch: h${unit} = max(0, ${n(current.input)}) = ${n(current.output)}. Each unit makes this decision independently.`, `应用该分支：h${unit} = max(0, ${n(current.input)}) = ${n(current.output)}。每个单元独立做出这个选择。`),
    current.atBend ? t('Exactly at zero, the ordinary derivative does not exist. This implementation chooses subgradient 0, so the reverse gradient is blocked.', '恰好在零点，普通导数不存在。本实现选择次梯度 0，因此反向梯度被阻断。') : t(`The local slope is ${current.slope}. Multiply an incoming gradient by ${current.slope}: ${current.slope ? 'the positive branch passes it through' : 'the flat branch blocks it'}.`, `局部斜率为 ${current.slope}。将传入梯度乘以 ${current.slope}：${current.slope ? '正数分支让它通过' : '水平分支阻断它'}。`),
  ];
  return <ExperimentFrame language={language}
    title={t('ReLU: one bend, two different paths', 'ReLU：一个折点，两条路径')}
    description={t('Move a preactivation through zero. The same choice controls both its output and the gradient that can return through it.', '将预激活值移过零点。同一个选择既决定输出，也决定梯度能否沿原路返回。')}
    controls={<>
      <div className="scene-actions">{values.map((value, index) => <Button key={index} type="button" size="sm" variant={selected === index ? 'default' : 'outline'} aria-pressed={selected === index} onClick={() => setSelected(index)}>a{index ? '₁' : '₀'} = {n(value)}</Button>)}</div>
      <RangeControl label={`${t('Selected preactivation', '所选预激活值')} a${unit}`} value={current.input} min={-2} max={2} step={0.01} onChange={setValue} />
      <div className="scene-actions"><Button type="button" size="sm" variant="outline" onClick={() => setValue(0)}>{t('Try exactly zero', '试试恰好为零')}</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setValues([0.8, -1.2]); setSelected(0); setStep(0); }}>{t('Reset values', '重置数值')}</Button></div>
    </>}
    readout={<>
      <div className="scene-metrics"><Metric label={t('Before ReLU: a', 'ReLU 前：a')} value={pair(values)} />{step >= 2 && <Metric label={t('After ReLU: h', 'ReLU 后：h')} value={pair(calculations.map(item => item.output))} />}{step === 3 && <Metric label={`∂h${unit} / ∂a${unit}`} value={current.atBend ? t('0 chosen at the bend', '折点处选择 0') : current.slope} />}</div>
      {step >= 1 && <p className="scene-equation">{n(current.input)} &gt; 0 ? {n(current.input)} : 0{step >= 2 ? ` = ${n(current.output)}` : ''}</p>}
      {step === 3 && <><p className="scene-equation">g_a = g_h × {current.slope}</p><p className="scene-note">{t('For a > 0 the slope is 1; for a < 0 it is 0. At a = 0 the code chooses 0, rather than claiming a derivative exists.', 'a > 0 时斜率为 1；a < 0 时为 0。a = 0 时，代码选择 0，并非声称这里存在导数。')}</p></>}
    </>}
    steps={steps} step={step} onStep={setStep}
    caption={t('The two starting values come from the authored first row. Here you edit preactivations directly; the network’s weights stay fixed.', '两个初始值来自教材的第一行样本。在这里直接编辑预激活值；网络权重保持固定。')}
  >
    <svg viewBox="0 0 360 320" role="group" aria-label={t(`ReLU graph. Selected a${selected} is ${n(current.input)}, output ${n(current.output)}, local slope ${current.slope}.`, `ReLU 图。所选 a${selected} 为 ${n(current.input)}，输出为 ${n(current.output)}，局部斜率为 ${current.slope}。`)}>
      <rect x="46" y="34" width="134" height="184" fill={ink.b} fillOpacity={step >= 1 && current.input <= 0 ? 0.07 : 0.025} />
      <rect x="180" y="34" width="134" height="184" fill={ink.a} fillOpacity={step >= 1 && current.input > 0 ? 0.07 : 0.025} />
      {[0.5, 1, 1.5, 2].map(value => <line key={value} x1="46" x2="314" y1={y(value)} y2={y(value)} stroke={ink.grid} />)}
      <line x1="40" x2="326" y1="198" y2="198" stroke="currentColor" strokeOpacity="0.4" />
      <line x1="180" x2="180" y1="25" y2="220" stroke="currentColor" strokeOpacity="0.4" />
      <path d="M46,198 H180 L314,64" fill="none" stroke="currentColor" strokeOpacity="0.13" strokeWidth="5" />
      {step >= 1 && <path d={current.input > 0 ? 'M180,198 L314,64' : 'M46,198 H180'} fill="none" stroke={current.input > 0 ? ink.a : ink.b} strokeWidth="4" />}
      <text x="332" y="205" style={text}>a</text><text x="187" y="26" style={text}>h</text>
      {[-2, -1, 0, 1, 2].map(value => <text key={value} x={x(value)} y="242" textAnchor="middle" style={text}>{value}</text>)}
      <text x="165" y={y(1) + 6} textAnchor="end" style={text}>1</text><text x="165" y={y(2) + 6} textAnchor="end" style={text}>2</text>
      {calculations.map((item, index) => <g key={index}>
        {step >= 2 && <line x1={x(item.input)} x2={x(item.input)} y1="198" y2={y(item.output)} stroke={index ? ink.b : ink.a} strokeDasharray="4 4" strokeWidth="2" />}
        {index !== selected && <circle cx={x(item.input)} cy={step >= 2 ? y(item.output) : 198} r="6" fill={index ? ink.b : ink.a} />}
        <text x={x(item.input)} y={(step >= 2 ? y(item.output) : 198) + (index === 1 && Math.abs(values[0] - values[1]) < 0.3 ? 25 : -17)} textAnchor="middle" style={{ ...halo, fill: index ? ink.b : ink.a }}>a{index ? '₁' : '₀'}</text>
      </g>)}
      {step === 3 && <g>
        <line x1={x(current.input) - 28} x2={x(current.input) + 28} y1={y(current.output) + 28 * current.slope} y2={y(current.output) - 28 * current.slope} stroke={ink.c} strokeWidth="3" />
        <text x="180" y="286" textAnchor="middle" style={{ ...text, fill: ink.c }}>{current.atBend ? t('a = 0: choose gate 0', 'a = 0：选择门值 0') : `g_h × ${current.slope} → g_a`}</text>
      </g>}
      {step < 3 && <text x="180" y="286" textAnchor="middle" style={text}>{step === 0 ? t('Drag a point through zero', '将点拖过零点') : step === 1 ? t('a > 0 ? keep : zero', 'a > 0 ? 保留 : 零') : `h${unit} = ${n(current.output)}`}</text>}
      <SvgHandle x={x(current.input)} y={step >= 2 ? y(current.output) : 198} color={selected ? ink.b : ink.a} label={t(`Preactivation a${selected}: ${n(current.input)}. Drag horizontally or use arrow keys.`, `预激活值 a${selected}：${n(current.input)}。水平拖动或使用方向键。`)} onMove={point => setValue((point.x - 180) / 67)} onNudge={(dx, dy) => setValue(current.input + (dx || -dy) * 0.05)} />
    </svg>
  </ExperimentFrame>;
}

function BackpropLab({ language = 'en' }) {
  const t = (en, zh) => words(language, en, zh);
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState([1, 1]);
  const [target, setTarget] = useState(0);
  const [parameter, setParameter] = useState('W1');
  const f = neuralBackward(initialNetwork, inputs, target);
  const check = neuralFiniteDifference(initialNetwork, inputs, target, parameter, 0, 0);
  const id = useId().replace(/:/g, '');
  const forwardArrow = `neural-forward-${id}`;
  const reverseArrow = `neural-reverse-${id}`;
  const steps = [
    t('Save the forward values and the old weights. These exact numbers are the ingredients for the reverse calculation.', '保存前向数值和旧权重。反向计算使用的正是这些数值。'),
    t(`Start at the one-example loss. Subtract target ${pair(target === 0 ? [1, 0] : [0, 1])} from p to get the two score gradients.`, `从单个样本的损失开始。从 p 中减去目标 ${pair(target === 0 ? [1, 0] : [0, 1])}，得到两个分数梯度。`),
    t('For each hidden unit, add both outgoing gradient contributions. Then multiply by the saved ReLU gate: 1 above zero, otherwise 0.', '对每个隐藏单元，将两条输出路径的梯度贡献相加，再乘以保存的 ReLU 门值：正数时为 1，其余为 0。'),
    t(`Use the saved input to a multiplication to obtain ∂ℓ/∂${parameter}[0][0]. The small perturbation checks this sensitivity; no weight has been updated.`, `利用乘法节点保存的输入，得到 ∂ℓ/∂${parameter}[0][0]。微小扰动用于核对该敏感度；尚未更新任何权重。`),
  ];
  const changeInput = (index, value) => setInputs(old => old.map((item, i) => i === index ? value : item));
  const y = index => index ? 240 : 96;
  return <ExperimentFrame language={language}
    title={t('Backpropagation: follow the sensitivity home', '反向传播：沿原路追踪敏感度')}
    description={t('The same two-hidden-unit network, with one example’s loss. Switch the target or an input to see both outgoing paths change.', '使用同一个双隐藏单元网络，观察单个样本的损失。切换目标或输入，查看两条输出路径如何变化。')}
    controls={<>
      {inputs.map((value, index) => <RangeControl key={index} label={`${t('Input', '输入')} x${index ? '₁' : '₀'}`} value={value} min={-2} max={2} step={0.05} onChange={value => changeInput(index, value)} />)}
      <div className="scene-actions">{[0, 1].map(value => <Button key={value} type="button" size="sm" variant={target === value ? 'default' : 'outline'} aria-pressed={target === value} onClick={() => setTarget(value)}>{t('Target', '目标')} {value}</Button>)}</div>
      <div className="scene-actions">{['W1', 'W2'].map(name => <Button key={name} type="button" size="sm" variant={parameter === name ? 'default' : 'outline'} aria-pressed={parameter === name} onClick={() => setParameter(name)}>{name}[0][0]</Button>)}</div>
    </>}
    readout={<>
      <div className="scene-metrics"><Metric label={t('One-example loss ℓ', '单样本损失 ℓ')} value={n(f.loss, 6)} /><Metric label="a → h" value={`${pair(f.a)} → ${pair(f.h)}`} /><Metric label="z → p" value={`${pair(f.z)} → ${pair(f.p)}`} />{step >= 1 && <Metric label="g_z = p − target" value={pair(f.dz)} />}{step >= 2 && <><Metric label="g_h = g_z W₂ᵀ" value={pair(f.dh)} /><Metric label="g_a = g_h ⊙ gate" value={`${pair(f.dh)} ⊙ ${pair(f.gates)} = ${pair(f.da)}`} /></>}</div>
      {step >= 2 && <p className="scene-equation">g_h₀ = 0.5 × ({n(f.dz[0])}) − 0.5 × ({n(f.dz[1])}) = {n(f.dh[0])}</p>}
      {step === 3 && <>
        <p className="scene-equation">{parameter === 'W1' ? `∂ℓ/∂W₁[0][0] = x₀ × gate₀ × g_h₀ = ${n(inputs[0])} × ${f.gates[0]} × (${n(f.dh[0])}) = ${n(check.analytic, 6)}` : `∂ℓ/∂W₂[0][0] = h₀ × g_z₀ = ${n(f.h[0])} × (${n(f.dz[0])}) = ${n(check.analytic, 6)}`}</p>
        <p className="scene-equation">(ℓ(w + ε) − ℓ(w − ε)) / (2ε) = {n(check.numerical, 6)}</p>
        <div className="scene-metrics"><Metric label="ε" value="0.00001" /><Metric label={t('Absolute difference', '绝对差')} value={check.error < 1e-8 ? '< 0.00000001' : n(check.error, 8)} /></div>
        {check.crossesBend && <p className="scene-note">{t('This perturbation touches a ReLU bend. A central difference there may differ from our chosen zero subgradient; it is not an ordinary derivative check.', '此扰动触及 ReLU 折点。这里的中心差分可能不同于所选的零次梯度，不能作为普通导数核对。')}</p>}
      </>}
      <p className="scene-note">{t('All weights remain at their authored starting values. These are single-example gradients; full-batch training averages the four examples once.', '所有权重保持教材中的初始值。这里显示单样本梯度；全批量训练会对四个样本的梯度取一次平均。')}</p>
    </>}
    steps={steps} step={step} onStep={setStep}
    caption={t('Solid connections carry forward values. Dashed arrows carry reverse sensitivity. A crossed gate has zero reverse gradient.', '实线连接传递前向数值，虚线箭头传递反向敏感度。被划掉的门，其反向梯度为零。')}
  >
    <svg viewBox="0 0 360 360" role="img" aria-label={t(`Two-layer computation. Hidden values ${pair(f.h)}. Score gradients ${pair(f.dz)}. ReLU gates ${pair(f.gates)}.`, `双层计算图。隐藏值 ${pair(f.h)}。分数梯度 ${pair(f.dz)}。ReLU 门值 ${pair(f.gates)}。`)}>
      <defs>{[[forwardArrow, ink.a], [reverseArrow, ink.b]].map(([marker, color]) => <marker key={marker} id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3.5 L0,7" fill={color} /></marker>)}</defs>
      {[0, 1].flatMap(source => [0, 1].map(destination => <g key={`${source}-${destination}`}>
        <line x1="65" y1={y(source)} x2="149" y2={y(destination)} stroke={ink.a} strokeWidth={parameter === 'W1' && source === 0 && destination === 0 ? 3 : 1.5} strokeOpacity="0.3" markerEnd={`url(#${forwardArrow})`} />
        <line x1="211" y1={y(source)} x2="294" y2={y(destination)} stroke={ink.a} strokeWidth={parameter === 'W2' && source === 0 && destination === 0 ? 3 : 1.5} strokeOpacity="0.3" markerEnd={`url(#${forwardArrow})`} />
        {step >= 1 && <line x1="292" y1={y(destination) + 7} x2="213" y2={y(source) + 7} stroke={ink.b} strokeWidth={source === 0 ? 2.5 : 1.5} strokeOpacity={source === 0 ? 0.85 : 0.5} strokeDasharray="4 4" markerEnd={`url(#${reverseArrow})`} />}
        {step === 3 && <line x1="147" y1={y(destination) + 7} x2="67" y2={y(source) + 7} stroke={ink.b} strokeWidth="2" strokeOpacity={f.gates[destination] ? 0.85 : 0.15} strokeDasharray="4 4" markerEnd={`url(#${reverseArrow})`} />}
      </g>))}
      <text x="35" y="22" textAnchor="middle" style={text}>x</text><text x="180" y="22" textAnchor="middle" style={text}>a → h</text><text x="325" y="22" textAnchor="middle" style={text}>z → p</text>
      {[0, 1].map(index => <g key={index}>
        <circle cx="35" cy={y(index)} r="29" fill="var(--background)" stroke={ink.c} strokeWidth="2" /><text x="35" y={y(index) + 6} textAnchor="middle" style={text}>{n(inputs[index], 2)}</text><text x="35" y={y(index) + 49} textAnchor="middle" style={text}>x{index ? '₁' : '₀'}</text>
        <text x="180" y={y(index) - 41} textAnchor="middle" style={text}>{n(f.a[index], 2)}</text>
        <circle cx="180" cy={y(index)} r="30" fill="var(--background)" stroke={f.gates[index] ? ink.a : ink.grid} strokeWidth="2" />
        <text x="180" y={y(index) + 6} textAnchor="middle" style={text}>{n(f.h[index], 2)}</text>
        <text x="180" y={y(index) + 49} textAnchor="middle" style={text}>h{index ? '₁' : '₀'}</text>
        {step >= 2 && !f.gates[index] && <path d={`M157,${y(index) + 22} L203,${y(index) - 22}`} stroke={ink.b} strokeWidth="3" />}
        <text x="325" y={y(index) - 41} textAnchor="middle" style={text}>{n(f.z[index], 2)}</text>
        <circle cx="325" cy={y(index)} r="29" fill="var(--background)" stroke={index === target ? ink.a : ink.grid} strokeWidth={index === target ? 3 : 2} />
        <text x="325" y={y(index) + 6} textAnchor="middle" style={text}>{n(f.p[index], 2)}</text><text x="325" y={y(index) + 49} textAnchor="middle" style={text}>p{index ? '₁' : '₀'}</text>
        {step >= 1 && <text x="325" y={y(index) + 70} textAnchor="middle" style={{ ...text, fill: ink.b }}>{n(f.dz[index])}</text>}
        {step >= 2 && <text x="180" y={y(index) + 70} textAnchor="middle" style={{ ...text, fill: ink.b }}>{f.gates[index] ? n(f.da[index]) : t('blocked', '已阻断')}</text>}
      </g>)}
      {step === 3 && <text x="180" y="350" textAnchor="middle" style={{ ...text, fill: ink.b }}>∂ℓ/∂{parameter}[0][0] = {n(check.analytic)}</text>}
    </svg>
  </ExperimentFrame>;
}

function TrainingLab({ language = 'en' }) {
  const t = (en, zh) => words(language, en, zh);
  const [step, setStep] = useState(0);
  const [eta, setEta] = useState(0.1);
  const [epoch, setEpoch] = useState(0);
  const [probe, setProbe] = useState([1, 1]);
  const history = useMemo(() => neuralTrainingHistory(eta), [eta]);
  const frame = history[epoch];
  const plane = useMemo(() => neuralProbabilityGrid(frame.net), [frame.net]);
  const prediction = neuralForward(frame.net, probe);
  const gradient = useMemo(() => neuralMeanGradients(frame.net), [frame.net]);
  const candidate = epoch < MAX_TRAINING_STEPS ? history[epoch + 1] : null;
  const nextWeight = frame.net.W1[0][0] - eta * gradient.W1[0][0];
  const clip = `neural-plane-${useId().replace(/:/g, '')}`;
  const x = value => 180 + value * 75;
  const y = value => 146 - value * 75;
  const lossX = value => 60 + value * 2;
  const lossY = value => 329 - value * 70;
  const moveProbe = point => setProbe([round(clamp((point.x - 180) / 75, -1.6, 1.6)), round(clamp((146 - point.y) / 75, -1.6, 1.6))]);
  const chooseEpoch = value => setEpoch(clamp(Math.round(value), 0, MAX_TRAINING_STEPS));
  const steps = [
    t('Four labeled rows are the whole training set. Circles are class 0; squares are class 1. The starting network already gets all four labels right.', '这四行带标签的样本就是全部训练集。圆形表示类别 0，方形表示类别 1。初始网络已经正确预测全部四个标签。'),
    t('At this step’s weights, run all four rows forward and average their losses. Drag the probe to inspect predictions between the observed points.', '使用当前步的权重，对四行样本进行前向计算，并对损失取平均。拖动探针，查看已知样本之间的预测。'),
    t('Compute the 12 mean-loss gradients from the same old weights. Each example contributes one fourth of its loss gradient; the probe is not a training example.', '根据同一组旧权重计算 12 个平均损失梯度。每个样本贡献其损失梯度的四分之一；探针并不是训练样本。'),
    t('Subtract η times each mean gradient, updating all 12 parameters together. Step through the bounded history; training confidence is not evidence of generalization.', '每个参数减去 η 乘以平均梯度，同时更新全部 12 个参数。逐步查看这段有界历史；训练置信度不能证明泛化能力。'),
  ];
  return <ExperimentFrame language={language}
    title={t('Train the actual tiny network', '训练这个真实的小网络')}
    description={t('Watch the probability plane and measured mean loss change across at most 120 full-batch updates. Each cell is evaluated with the current weights.', '观察概率平面与实测平均损失，最多进行 120 次全批量更新。每个色块都来自当前网络的计算。')}
    controls={<>
      <RangeControl label={t('Training step', '训练步数')} value={epoch} min={0} max={MAX_TRAINING_STEPS} step={1} display={`${epoch} / ${MAX_TRAINING_STEPS}`} onChange={chooseEpoch} />
      <div className="scene-actions">{[1, 10].map(count => <Button key={count} type="button" size="sm" variant="outline" disabled={epoch + count > MAX_TRAINING_STEPS} onClick={() => chooseEpoch(epoch + count)}>+{count}</Button>)}<Button type="button" size="sm" variant="outline" disabled={epoch === MAX_TRAINING_STEPS} onClick={() => chooseEpoch(MAX_TRAINING_STEPS)}>{t('Step 120', '第 120 步')}</Button><Button type="button" size="sm" variant="ghost" disabled={epoch === 0} onClick={() => setEpoch(0)}>{t('Reset step', '重置步数')}</Button></div>
      <RangeControl label={t('Learning rate η · restarts trajectory', '学习率 η · 重新开始轨迹')} value={eta} min={0} max={0.2} step={0.01} display={n(eta, 2)} onChange={value => { setEta(value); setEpoch(0); }} />
      <p className="scene-note">{t('Inspect a known row or drag the crosshair:', '选择已知样本，或拖动十字探针：')}</p>
      <div className="scene-actions">{TRAINING_INPUTS.map((input, index) => <Button key={index} type="button" size="sm" variant={probe.every((value, i) => value === input[i]) ? 'default' : 'outline'} aria-pressed={probe.every((value, i) => value === input[i])} onClick={() => setProbe([...input])}>{pair(input)} → {TRAINING_LABELS[index]}</Button>)}</div>
    </>}
    readout={<>
      <div className="scene-metrics"><Metric label={t('Measured mean loss', '实测平均损失')} value={n(frame.loss, 6)} /><Metric label={t('Correct training labels', '正确的训练标签')} value={`${frame.correct} / 4`} /><Metric label={`${t('Probe', '探针')} x = ${pair(probe)}`} value={`${t('class', '类别')} ${prediction.prediction} · p₀ = ${n(prediction.p[0] * 100, 1)}%`} />{step >= 1 && <Metric label={t('Probe hidden row h', '探针的隐藏行 h')} value={pair(prediction.h)} />}{step >= 2 && <Metric label="∂L/∂W₁[0][0]" value={n(gradient.W1[0][0], 6)} />}</div>
      {step === 3 && <><p className="scene-equation">W₁[0][0]′ = {n(frame.net.W1[0][0], 6)} − {n(eta)} × ({n(gradient.W1[0][0], 6)}) = {n(nextWeight, 6)}</p><p className="scene-note">{candidate ? t(`Next measured mean loss: ${n(candidate.loss, 6)}.`, `下一步实测平均损失：${n(candidate.loss, 6)}。`) : t('Step 120 is the final state in this run. The formula shows a possible next subtraction, which is not part of the bounded history.', '第 120 步是本轮最后状态。公式展示了可能的下一次相减，但它不属于这段有界历史。')}</p></>}
      <details className="scene-note"><summary>{t('Inspect all 12 current parameters', '查看当前全部 12 个参数')}</summary><p>W₁ = {frame.net.W1.map(pair).join('; ')}<br />b₁ = {pair(frame.net.b1)}<br />W₂ = {frame.net.W2.map(pair).join('; ')}<br />b₂ = {pair(frame.net.b2)}</p></details>
      <p className="scene-note">{eta === 0 ? t('η = 0 keeps every weight and every loss unchanged. ', 'η = 0 时，所有权重与损失保持不变。') : ''}{t('There is no held-out set. The colors between the four observations are predictions, not verified labels.', '这里没有留出测试集。四个观测点之间的颜色表示预测，并非已验证的标签。')}</p>
    </>}
    steps={steps} step={step} onStep={setStep}
    caption={t('Blue favors class 0; violet favors class 1. The contour estimates p₀ = 0.5 on a 25 × 25 grid. The lower curve is mean training loss; its cursor is independent of the four explanation stages.', '蓝色偏向类别 0，紫色偏向类别 1。等值线在 25 × 25 网格上估计 p₀ = 0.5。下方曲线表示平均训练损失，其光标与四个讲解阶段相互独立。')}
  >
    <svg viewBox="0 0 360 365" role="group" aria-label={t(`Probability plane at training step ${epoch}, mean loss ${n(frame.loss, 6)}, ${frame.correct} of four training labels correct. Drag the crosshair or loss cursor.`, `第 ${epoch} 步的概率平面，平均损失 ${n(frame.loss, 6)}，正确预测 ${frame.correct} 个训练标签。可拖动十字探针或损失光标。`)}>
      <defs><clipPath id={clip}><rect x="60" y="26" width="240" height="240" /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        {plane.nodes.flat().map((node, index) => <rect key={index} x={x(node.x) - plane.stride * 37.5} y={y(node.y) - plane.stride * 37.5} width={plane.stride * 75 + 0.3} height={plane.stride * 75 + 0.3} fill={`color-mix(in srgb, ${ink.a} ${n(node.p0 * 100, 2)}%, ${ink.b})`} fillOpacity="0.56" />)}
        <line x1="60" x2="300" y1="146" y2="146" stroke="currentColor" strokeOpacity="0.18" /><line x1="180" x2="180" y1="26" y2="266" stroke="currentColor" strokeOpacity="0.18" />
        {plane.contour.map((segment, index) => <path key={index} d={`M${x(segment[0][0])},${y(segment[0][1])} L${x(segment[1][0])},${y(segment[1][1])}`} stroke="var(--foreground)" strokeWidth="2" strokeOpacity="0.7" fill="none" />)}
        {TRAINING_INPUTS.map((input, index) => <g key={index}>
          {TRAINING_LABELS[index] === 0 ? <circle cx={x(input[0])} cy={y(input[1])} r={step === 0 ? 8 : 6} fill={ink.a} stroke="var(--background)" strokeWidth="2" /> : <rect x={x(input[0]) - (step === 0 ? 8 : 6)} y={y(input[1]) - (step === 0 ? 8 : 6)} width={step === 0 ? 16 : 12} height={step === 0 ? 16 : 12} fill={ink.b} stroke="var(--background)" strokeWidth="2" />}
        </g>)}
        <path d={`M${x(probe[0]) - 13},${y(probe[1])} H${x(probe[0]) + 13} M${x(probe[0])},${y(probe[1]) - 13} V${y(probe[1]) + 13}`} stroke="var(--background)" strokeWidth="4" />
        <path d={`M${x(probe[0]) - 13},${y(probe[1])} H${x(probe[0]) + 13} M${x(probe[0])},${y(probe[1]) - 13} V${y(probe[1]) + 13}`} stroke="currentColor" strokeWidth="1.5" />
      </g>
      <rect x="60" y="26" width="240" height="240" fill="none" stroke="currentColor" strokeOpacity="0.3" />
      {[-1, 0, 1].map(value => <g key={value}><text x={x(value)} y="287" textAnchor="middle" style={text}>{value}</text><text x="47" y={y(value) + 6} textAnchor="end" style={text}>{value}</text></g>)}
      <text x="314" y="153" style={text}>x₀</text><text x="36" y="21" style={text}>x₁</text>
      <SvgHandle x={x(probe[0])} y={y(probe[1])} color="var(--foreground)" label={t(`Probe at ${pair(probe)}. Drag or use arrow keys to inspect the probability plane.`, `探针位于 ${pair(probe)}。拖动或使用方向键查看概率平面。`)} onMove={moveProbe} onNudge={(dx, dy) => setProbe(old => [round(clamp(old[0] + dx * 0.05, -1.6, 1.6)), round(clamp(old[1] - dy * 0.05, -1.6, 1.6))])} />
      <line x1="60" x2="300" y1="329" y2="329" stroke={ink.grid} />
      <path d={history.map((item, index) => `${index ? 'L' : 'M'}${lossX(index)},${lossY(item.loss)}`).join(' ')} stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" fill="none" />
      <path d={history.slice(0, epoch + 1).map((item, index) => `${index ? 'L' : 'M'}${lossX(index)},${lossY(item.loss)}`).join(' ')} stroke={ink.a} strokeWidth="3" fill="none" />
      {step >= 2 && candidate && <line x1={lossX(epoch)} y1={lossY(frame.loss)} x2={lossX(epoch + 1)} y2={lossY(candidate.loss)} stroke={ink.b} strokeWidth="4" />}
      <line x1={lossX(epoch)} x2={lossX(epoch)} y1="292" y2="332" stroke={ink.a} strokeOpacity="0.4" />
      <text x="27" y="320" style={text}>L</text><text x="60" y="355" textAnchor="middle" style={text}>0</text><text x="180" y="355" textAnchor="middle" style={text}>{t('step', '步数')}</text><text x="300" y="355" textAnchor="middle" style={text}>120</text>
      <SvgHandle x={lossX(epoch)} y={lossY(frame.loss)} color={ink.a} label={t(`Training step ${epoch}; mean loss ${n(frame.loss, 6)}. Drag horizontally or use arrow keys to scrub steps 0 to 120.`, `训练第 ${epoch} 步；平均损失 ${n(frame.loss, 6)}。水平拖动或使用方向键，查看第 0 至 120 步。`)} onMove={point => chooseEpoch((point.x - 60) / 2)} onNudge={(dx, dy) => chooseEpoch(epoch + (dx || -dy))} />
    </svg>
  </ExperimentFrame>;
}

export const neuralExperiments = {
  'ml-relu-branches': { title: { en: 'ReLU: follow the bend', zh: 'ReLU：追踪折点' }, Component: ReluLab },
  'ml-reverse-gradients': { title: { en: 'Backpropagation: follow every path', zh: '反向传播：追踪每条路径' }, Component: BackpropLab },
  'ml-bounded-training-loop': { title: { en: 'Train the tiny network', zh: '训练小网络' }, Component: TrainingLab },
};
