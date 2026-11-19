import { symbolGroups } from './symbol-catalog.mjs';

export function sectionForPath(pathname) {
  const path = pathname.replace(/\/+$/, '').replace(/\.html$/, '');
  if (path === '/cheatsheet') return 'cheatsheet';
  if (path === '/machine-learning') return 'ml';
  if (['', '/index', '/PYTHON-README', '/README-zh'].includes(path)) return 'reference';
  return 'project';
}

const boundaries = [
  ['start', 'Start here', '从这里开始', ['math-as-code', 'foreword', '前言']],
  ['basics', 'Numbers & notation', '数字与符号', ['variable-name-conventions', '变量名约定']],
  ['vectors', 'Vectors & products', '向量与乘积', ['dot--cross', '点--叉']],
  ['sums', 'Sums & magnitudes', '求和与大小', ['sigma', '西格玛sigma']],
  ['sets', 'Sets & number systems', '集合与数系', ['element', '属于']],
  ['functions', 'Functions & logic', '函数与逻辑', ['function', 'functions', '函数']],
  ['matrices', 'Matrices & tensors', '矩阵与张量', ['matrix-multiplication', '矩阵乘法']],
  ['calculus', 'Change & calculus', '变化与微积分', ['delta']],
  ['graphics', 'Worked graphics example', '图形学实例', ['worked-graphics-expression', '图形学实例lambertian-反射']],
  ['arithmetic', 'Powers, angles & counting', '幂、角度与计数', ['powers-and-logarithms', '幂与对数']],
  ['statistics', 'Probability & statistics', '概率与统计', ['probability', '概率']],
  ['about', 'About the guide', '关于指南', ['more', '更多']]
];

// The translated guide keeps its own public anchors, rather than English IDs.
const chineseTopics = new Map(Object.entries({
  'equals-symbols': '等号', 'scalar-multiplication': '标量乘法',
  'square-root-and-complex-numbers': '平方根与复数', 'powers-and-logarithms': '幂与对数',
  trigonometry: '三角函数', 'modular-arithmetic': '模运算', 'factorials-and-combinations': '阶乘与组合',
  'variable-name-conventions': '变量名约定', 'matrix-multiplication': '矩阵乘法',
  'vector-multiplication': '向量乘法', 'dot-product': '点乘', 'cross-product': '叉乘',
  sigma: '西格玛sigma', averages: '平均值', 'capital-pi': '大写-pi', 'absolute-value': '绝对值',
  'euclidean-norm': '欧几里得模euclidean-norm', determinant: '行列式', hat: '帽子',
  'tensor-product': '张量积', element: '属于', 'common-number-sets': '常见数字集',
  inequality: '等式equality', 'conjunction--disjunction': '与conjunction--或disjunction',
  'logical-negation': '逻辑非logical-negation', 'material-implication': '实质蕴含material-implication',
  intervals: '区间intervals', probability: '概率', 'function-notation': '函数符号',
  'piecewise-function': '分段函数', 'common-functions': '通用函数', prime: '撇号prime',
  'floor--ceiling': '向下取整和向上取整floor--ceiling', delta: 'delta', derivatives: '导数',
  'gradients-and-gradient-descent': '梯度与梯度下降', integrals: '积分',
  'worked-graphics-expression': '图形学实例lambertian-反射', 'expected-value': '期望值',
  'variance-and-standard-deviation': '方差与标准差', 'conditional-probability-and-bayes': '条件概率与贝叶斯定理',
  'covariance-and-correlation': '协方差与相关性', entropy: '熵'
}).map(([canonical, localized]) => [localized, canonical]));

const aliases = new Map();
for (const { entries } of symbolGroups) for (const entry of entries) {
  const [path, hash] = entry.lesson.split('#');
  const key = `${path === '/' ? 'reference' : 'ml'}:${decodeURIComponent(hash || '')}`;
  aliases.set(key, `${aliases.get(key) || ''} ${entry.symbol} ${entry.name} ${entry.keywords || ''}`);
}

/** Derive rows from every reader topic, including headings omitted in the TOC. */
export function navigationGroups(topics, labels = new Map(), { section = 'reference', zh = false } = {}) {
  const groups = [];
  let current;
  let parentTitle = '';
  for (const [index, topic] of topics.entries()) {
    const depth = Number(topic.heading?.tagName?.slice(1)) || 1;
    const boundary = section === 'reference'
      ? boundaries.find(item => item[3].includes(topic.id)) || (index === 0 ? boundaries[0] : undefined)
      : undefined;
    if (!current || boundary && current.id !== boundary[0]) {
      const definition = boundary || [section, section === 'ml' ? 'ML & deep learning' : 'On this page', '本页内容'];
      current = { id: definition[0], title: definition[zh ? 2 : 1], items: [] };
      groups.push(current);
    }
    const title = index === 0 && ['reference', 'ml'].includes(section) ? (zh ? '概览' : 'Overview') : labels.get(topic.id) || topic.title;
    if (depth <= 2) parentTitle = title;
    const canonicalId = zh ? chineseTopics.get(topic.id) || topic.id : topic.id;
    current.items.push({ topic, index, title, nested: depth > 2,
      search: `${title} ${topic.title} ${parentTitle} ${current.title} ${aliases.get(`${section}:${canonicalId}`) || ''}`.toLocaleLowerCase() });
  }
  return groups;
}

export function filterNavigation(groups, query = '') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return groups.map(group => ({ ...group, items: group.items.filter(item => terms.every(term => item.search.includes(term))) })).filter(group => group.items.length);
}
