/**
 * Cosine Similarity & Vector Operations
 */

// L2 Unit Normalization (||v|| = 1.0)
export function normalizeL2(vector: number[]): number[] {
  if (!vector || vector.length === 0) return [];
  
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSq += vector[i] * vector[i];
  }
  
  const norm = Math.sqrt(sumSq);
  if (norm === 0 || isNaN(norm)) return vector;
  
  return vector.map((val) => val / norm);
}

// Cosine Similarity: Dot product of normalized unit vectors (-1.0 to 1.0)
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;

  const normA = normalizeL2(a);
  const normB = normalizeL2(b);

  let dot = 0;
  for (let i = 0; i < normA.length; i++) {
    dot += normA[i] * normB[i];
  }

  return Math.max(-1, Math.min(1, dot));
}


export function computeEuclideanDistance(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 99;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function aggregateEmbeddings(samples: number[][]): number[] {
  if (!samples || samples.length === 0) return [];
  const dim = samples[0].length;
  const avg = new Array(dim).fill(0);

  for (const sample of samples) {
    for (let i = 0; i < dim; i++) {
      avg[i] += sample[i] / samples.length;
    }
  }

  return normalizeL2(avg);
}

export function filterConsistentEmbeddings(samples: number[][], threshold = 0.40): { valid: number[][]; excludedCount: number } {
  if (samples.length <= 2) return { valid: samples, excludedCount: 0 };
  
  // গড় ভেক্টর তৈরি
  const centroid = aggregateEmbeddings(samples);
  const valid = samples.filter((s) => computeCosineSimilarity(s, centroid) >= threshold);
  
  return {
    valid: valid.length >= 2 ? valid : samples,
    excludedCount: samples.length - (valid.length >= 2 ? valid.length : samples.length),
  };
}