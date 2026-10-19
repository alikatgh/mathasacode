import { geometryExperiments } from './geometry.jsx';
import { learningExperiments } from './learning-scenes.jsx';
import { calculusStatisticsExperiments } from './calculus-statistics.jsx';
import { neuralExperiments } from './neural-labs.jsx';

const experiments = { ...geometryExperiments, ...learningExperiments, ...calculusStatisticsExperiments, ...neuralExperiments };
export function experimentForConcept(kind) {
  // The same parallelogram explains both matrix multiplication and determinant.
  return experiments[kind === 'determinant' ? 'matrix' : kind] || null;
}
