import { detectMetadata, type MetadataResult } from './metadata-detector';
import { analyzeCodeStyle, type StyleResult } from './style-analyzer';
import { classifyWithML, type MLResult } from './ai-classifier';

export interface DetectionResult {
  combined_probability: number;
  risk_level: 'high' | 'medium' | 'low';
  metadata: MetadataResult;
  style: StyleResult;
  ml: MLResult | null;
  detection_method: string;
}

export async function detectAICode(
  code: string,
  language: string,
  commitMessage: string,
  prTitle?: string,
  prBody?: string,
): Promise<DetectionResult> {
  const metadata = detectMetadata(commitMessage, prTitle, prBody);
  const style = analyzeCodeStyle(code, language);
  const ml = await classifyWithML(code, language);

  let combined: number;
  let method: string;

  if (metadata.matched && ml) {
    combined = metadata.confidence * 0.40 + style.score * 0.30 + ml.probability * 0.30;
    method = 'metadata+style+ml';
  } else if (metadata.matched) {
    combined = metadata.confidence * 0.45 + style.score * 0.55;
    method = 'metadata+style';
  } else if (ml) {
    combined = style.score * 0.50 + ml.probability * 0.50;
    method = 'style+ml';
  } else {
    combined = style.score;
    method = 'style_only';
  }

  combined = Math.min(Math.max(combined, 0), 1);

  return {
    combined_probability: Math.round(combined * 100) / 100,
    risk_level: combined >= 0.7 ? 'high' : combined >= 0.4 ? 'medium' : 'low',
    metadata,
    style,
    ml,
    detection_method: method,
  };
}
