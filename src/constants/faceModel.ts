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

  // ArcFace 128D Cosine Similarity Threshold (>= 0.38 is positive identity match)
  defaultCosineThreshold: 0.38,
  defaultEuclideanThreshold: 0.70,


  minLivenessConfidence: 85.0,
  registrationSamplesRequired: 3,
  maxInferenceConcurrency: 1,
};

export const FACE_DETECTION_CONFIG = {
  minFaceSize: 0.15,
  minFaceSizeRatio: 0.15,
  maxFaceSizeRatio: 0.85,
  centerToleranceX: 0.3,
  centerToleranceY: 0.3,
  trackingConfidence: 0.7,
  minLightingScore: 0.4,
  maxBlurScore: 0.6,
};