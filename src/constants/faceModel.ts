export const FACE_MODEL_CONFIG = {
  modelName: "ArcFace-MobileFaceNet-ONNX",
  modelVersion: "1.2.0",
  modelAssetPath: "assets/models/arcface_mobilefacenet.onnx",
  inputWidth: 112,
  inputHeight: 112,
  inputChannels: 3,
  colorOrder: "RGB" as const,
  mean: [127.5, 127.5, 127.5] as [number, number, number],
  std: [128.0, 128.0, 128.0] as [number, number, number],
  embeddingDimension: 128,

  // ০.৫০ এর নিচে নামলে ভেরিফিকেশন পাস হবে না
  defaultCosineThreshold: 0.50,
  defaultEuclideanThreshold: 0.70,
  minLivenessConfidence: 85.0,
  registrationSamplesRequired: 3,
  maxInferenceConcurrency: 1,
};