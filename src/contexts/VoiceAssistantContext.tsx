
import React, { createContext, useState, useContext, useEffect } from "react";
import { azureSpeechService } from "../services/azureSpeechService";
import { SupportedLanguages, TranscriptionResult, AssistantState, AzureConfig } from "../types/voice-assistant";

type VoiceAssistantContextType = {
  apiKey: string;
  region: string;
  setApiKey: (key: string) => void;
  setRegion: (region: string) => void;
  state: AssistantState;
  sourceLanguage: string;
  targetLanguage: string;
  supportedLanguages: SupportedLanguages[];
  transcriptionHistory: TranscriptionResult[];
  currentTranscription: {
    originalText: string;
    translatedText: string;
  };
  setSourceLanguage: (language: string) => void;
  setTargetLanguage: (language: string) => void;
  startListening: () => void;
  stopListening: () => void;
  clearTranscriptionHistory: () => void;
  isConfigured: boolean;
};

const VoiceAssistantContext = createContext<VoiceAssistantContextType | null>(null);

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error("useVoiceAssistant must be used within a VoiceAssistantProvider");
  }
  return context;
};

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState("");
  const [region, setRegion] = useState("eastus");
  const [state, setState] = useState<AssistantState>(AssistantState.IDLE);
  const [sourceLanguage, setSourceLanguage] = useState("en-US");
  const [targetLanguage, setTargetLanguage] = useState("es-ES");
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguages[]>([]);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionResult[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState({
    originalText: "",
    translatedText: "",
  });
  const [recognitionSession, setRecognitionSession] = useState<any>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (apiKey && region) {
      try {
        const config: AzureConfig = { key: apiKey, region };
        azureSpeechService.setConfig(config);
        setIsConfigured(true);
        
        // Load supported languages
        azureSpeechService
          .getSupportedLanguages()
          .then((languages) => {
            setSupportedLanguages(languages);
          })
          .catch((error) => {
            console.error("Failed to load supported languages:", error);
          });
      } catch (error) {
        console.error("Failed to configure Azure Speech Service:", error);
        setIsConfigured(false);
      }
    } else {
      setIsConfigured(false);
    }
  }, [apiKey, region]);

  const startListening = async () => {
    if (!isConfigured) {
      console.error("Azure Speech Service not configured");
      setState(AssistantState.ERROR);
      return;
    }

    try {
      setState(AssistantState.LISTENING);
      setCurrentTranscription({ originalText: "", translatedText: "" });

      const session = await azureSpeechService.startRecognition(
        sourceLanguage,
        targetLanguage,
        (interimResult) => {
          setCurrentTranscription((prev) => ({
            ...prev,
            originalText: interimResult,
          }));
        },
        async (originalText, translatedText) => {
          setState(AssistantState.PROCESSING);
          
          const result: TranscriptionResult = {
            originalText,
            translatedText,
            fromLanguage: sourceLanguage,
            toLanguage: targetLanguage,
            timestamp: new Date(),
          };

          setCurrentTranscription({
            originalText,
            translatedText,
          });

          setTranscriptionHistory((prev) => [...prev, result]);

          // Speak the translated text
          setState(AssistantState.SPEAKING);
          try {
            const audioBuffer = await azureSpeechService.synthesizeSpeech(
              translatedText,
              targetLanguage
            );
            await azureSpeechService.playAudio(audioBuffer);
          } catch (error) {
            console.error("Error synthesizing speech:", error);
          } finally {
            setState(AssistantState.IDLE);
          }
        }
      );

      setRecognitionSession(session);
    } catch (error) {
      console.error("Error starting listening:", error);
      setState(AssistantState.ERROR);
    }
  };

  const stopListening = () => {
    if (recognitionSession) {
      recognitionSession.stop();
      setRecognitionSession(null);
    }
  };

  const clearTranscriptionHistory = () => {
    setTranscriptionHistory([]);
  };

  return (
    <VoiceAssistantContext.Provider
      value={{
        apiKey,
        region,
        setApiKey,
        setRegion,
        state,
        sourceLanguage,
        targetLanguage,
        supportedLanguages,
        transcriptionHistory,
        currentTranscription,
        setSourceLanguage,
        setTargetLanguage,
        startListening,
        stopListening,
        clearTranscriptionHistory,
        isConfigured,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};
