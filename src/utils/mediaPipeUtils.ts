export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Euclidean Distance calculation in 3D
function euclideanDistance(p1: Point3D, p2: Point3D): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
}

/**
 * Calculates Eye Aspect Ratio (EAR) for blink detection
 * Standard MediaPipe landmark indexes:
 * Left eye: 33, 160, 158, 133, 153, 144
 */
export function calculateEAR(landmarks: Point3D[]): number {
  // Left eye height and width vectors
  const p2_p6 = euclideanDistance(landmarks[160], landmarks[144]);
  const p3_p5 = euclideanDistance(landmarks[158], landmarks[153]);
  const p1_p4 = euclideanDistance(landmarks[33], landmarks[133]);

  return (p2_p6 + p3_p5) / (2.0 * p1_p4);
}

/**
 * Calculates Head Pose (Yaw / Pitch) from face landmarks
 * Nose: 1, Left cheek: 234, Right cheek: 454
 */
export function calculateHeadPose(landmarks: Point3D[]): { yaw: number; pitch: number } {
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  // Horizontal symmetry ratio (Yaw direction)
  const dLeft = Math.abs(nose.x - leftCheek.x);
  const dRight = Math.abs(rightCheek.x - nose.x);
  const yawRatio = dLeft / (dRight + 0.0001);

  return {
    yaw: yawRatio, // < 0.6 = Facing Right, > 1.6 = Facing Left
    pitch: nose.y,
  };
}