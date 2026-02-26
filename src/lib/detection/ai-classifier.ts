const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

export interface MLResult {
  probability: number;
  model_version: string;
  features_used: string[];
}

export async function classifyWithML(
  code: string,
  language: string
): Promise<MLResult | null> {
  if (!ML_SERVICE_URL) return null;

  try {
    const response = await fetch(`${ML_SERVICE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    console.warn('ML service unavailable, skipping Signal 3');
    return null;
  }
}
