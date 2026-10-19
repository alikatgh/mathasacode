import { register, render } from 'pele/core';
import flowchart from 'pele/diagrams/flowchart';

register(flowchart);

// Authored, local diagrams only. No user input, external links, or remote assets.
export const conceptMaps = Object.freeze({
  function: {
    en: ['A function, as a pipeline', 'flowchart LR\n A["Input: x"] --> B["square(x)"] --> C["Output: x²"]'],
    zh: ['把函数看作一条流水线', 'flowchart LR\n A["输入：x"] --> B["square(x)"] --> C["输出：x²"]']
  },
  gradient: {
    en: ['One learning step', 'flowchart LR\n A["Current weights"] --> B["Compute gradient"] --> C["Subtract η × gradient"] --> D["Updated weights"]'],
    zh: ['一次学习步骤', 'flowchart LR\n A["当前权重"] --> B["计算梯度"] --> C["减去 η × 梯度"] --> D["更新后的权重"]']
  },
  average: {
    en: ['From a sum to an average', 'flowchart LR\n A["n values"] --> B["Add them: Σ"] --> C["Divide by n"] --> D["Mean"]'],
    zh: ['从求和到平均值', 'flowchart LR\n A["n 个数值"] --> B["求和：Σ"] --> C["除以 n"] --> D["平均值"]']
  }
});

export function conceptForTopic(id) {
  if (['function-notation', '函数符号'].includes(id)) return 'function';
  if (['gradients-and-gradient-descent', '梯度与梯度下降'].includes(id)) return 'gradient';
  if (['averages', '平均值'].includes(id)) return 'average';
  return null;
}

export function renderConcept(kind, language = 'en', width = 720) {
  const entry = conceptMaps[kind]?.[language];
  if (!entry) throw new RangeError('Unknown concept map');
  return {
    title: entry[0],
    ...render(entry[1], { maxWidth: Math.max(240, width), fontFamily: 'system-ui, sans-serif', fontSize: 13, padding: 16, links: false, images: false, maxEdges: 12, idPrefix: `concept-${kind}-${language}` })
  };
}
