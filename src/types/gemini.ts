/** Outcomes from delivering a question to the Gemini web app. */
export type GeminiDelivery = 'sent' | 'filled' | 'unavailable' | 'failed';
export type GeminiAskResult = GeminiDelivery | 'empty' | 'too-long';
