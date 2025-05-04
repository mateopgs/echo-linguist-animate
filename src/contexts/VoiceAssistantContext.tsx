
import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { azureSpeechService } from "../services/azureSpeechService";
import { SupportedLanguages, TranscriptionResult, AssistantState, AzureConfig } from "../types/voice-assistant";
import { useToast } from "../hooks/use-toast";

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
  // Pre-configured API key from logs
  const [apiKey, setApiKey] = useState("3T3EuIFcgBiqLGtRbSd9PywVHAKw2RsbnROSIdWCmhPdvkIPnfD0JQQJ99BDACHYHv6XJ3w3AAAAACOGONVI");
  const [region, setRegion] = useState("eastus2");
  const [state, setState] = useState<AssistantState>(AssistantState.IDLE);
  const [sourceLanguage, setSourceLanguage] = useState("es-ES"); // Cambiado a español por defecto
  const [targetLanguage, setTargetLanguage] = useState("en-US"); // Cambiado a inglés como destino
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguages[]>([]);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionResult[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState({
    originalText: "",
    translatedText: "",
  });
  const recognitionSessionRef = useRef<any>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

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
            toast({
              title: "Error",
              description: "No se pudieron cargar los idiomas soportados",
              variant: "destructive",
            });
          });
      } catch (error) {
        console.error("Failed to configure Azure Speech Service:", error);
        setIsConfigured(false);
        toast({
          title: "Error de configuración",
          description: "No se pudo configurar el servicio de Azure Speech",
          variant: "destructive",
        });
      }
    } else {
      setIsConfigured(false);
    }
  }, [apiKey, region, toast]);

  const startListening = async () => {
    if (!isConfigured) {
      console.error("Azure Speech Service not configured");
      setState(AssistantState.ERROR);
      toast({
        title: "Error",
        description: "El servicio de Azure Speech no está configurado",
        variant: "destructive",
      });
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
            toast({
              title: "Error",
              description: "Error al sintetizar la voz",
              variant: "destructive",
            });
          } finally {
            setState(AssistantState.IDLE);
          }
        }
      );

      recognitionSessionRef.current = session;
    } catch (error) {
      console.error("Error starting listening:", error);
      setState(AssistantState.ERROR);
      toast({
        title: "Error",
        description: "Error al iniciar el reconocimiento de voz",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (recognitionSessionRef.current) {
      recognitionSessionRef.current.stop();
      recognitionSessionRef.current = null;
    }
    setState(AssistantState.IDLE);
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
