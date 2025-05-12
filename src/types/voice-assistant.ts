
// Azure Speech Service types
export type SupportedLanguages = {
  code: string;
  name: string;
  nativeName: string;
};

export type VoiceOption = {
  id: string;
  name: string; 
  gender: "Male" | "Female";
  isNeural?: boolean;
};

export type AzureConfig = {
  key: string;
  region: string;
};

export type TranscriptionResult = {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  timestamp: Date;
};

export enum AssistantState {
  IDLE = "idle",
  LISTENING = "listening",
  SPEAKING = "speaking",
  PROCESSING = "processing",
  ERROR = "error"
}
