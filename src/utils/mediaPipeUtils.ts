export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// ইউক্লিডিয়ান দূরত্ব
function euclideanDistance(p1: Point3D, p2: Point3D): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
}

/**
 * Eye Aspect Ratio (EAR) হিসাব করে ব্লিঙ্ক ডিটেকশন
 * চোখের স্ট্যান্ডার্ড ল্যান্ডমার্ক ইনডেক্স (MediaPipe):
 * বাম চোখ: 33, 160, 158, 133, 153, 144
 */
export function calculateEAR(landmarks: Point3D[]): number {
  // বাম চোখের উচ্চতা ও প্রস্থ ভেক্টর
  const p2_p6 = euclideanDistance(landmarks[160], landmarks[144]);
  const p3_p5 = euclideanDistance(landmarks[158], landmarks[153]);
  const p1_p4 = euclideanDistance(landmarks[33], landmarks[133]);

  return (p2_p6 + p3_p5) / (2.0 * p1_p4);
}

/**
 * Head Pose (Yaw / Pitch) হিসাব করে মাথা ঘোরানো যাচাই
 * নাক: 1, বাম কান: 234, ডান কান: 454
 */
export function calculateHeadPose(landmarks: Point3D[]): { yaw: number; pitch: number } {
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  // অনুভূমিক অনুপাত (মাথা ডানে নাকি বামে ঘুরছে)
  const dLeft = Math.abs(nose.x - leftCheek.x);
  const dRight = Math.abs(rightCheek.x - nose.x);
  const yawRatio = dLeft / (dRight + 0.0001);

  return {
    yaw: yawRatio, // < 0.6 = ডানদিকে তাকানো, > 1.6 = বামদিকে তাকানো
    pitch: nose.y,
  };
}