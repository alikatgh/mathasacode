import { geometryExperiments } from './geometry.jsx';
import { learningExperiments } from './learning-scenes.jsx';

const experiments = { ...geometryExperiments, ...learningExperiments };
export function experimentForConcept(kind) {
  // The same parallelogram explains both matrix multiplication and determinant.
  return experiments[kind === 'determinant' ? 'matrix' : kind] || null;
}
