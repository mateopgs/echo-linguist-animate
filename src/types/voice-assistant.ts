
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
  locale: string; // Add locale property to fix the TypeScript error
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

// Silence detection timeouts
export type VoiceAssistantContextTypeSilence = {
  initialSilenceTimeout: number;   // ms before recognizing speech as start
  endSilenceTimeout: number;       // ms of silence marking segment end
  setInitialSilenceTimeout: (ms: number) => void;
  setEndSilenceTimeout: (ms: number) => void;
};
