
import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { azureSpeechService } from "../services/azureSpeechService";
import { realTimeTranslationService, SegmentStatus, AudioSegment } from "../services/realTimeTranslationService";
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
  activeSegments: AudioSegment[];
  setSourceLanguage: (language: string) => void;
  setTargetLanguage: (language: string) => void;
  startListening: () => void;
  stopListening: () => void;
  clearTranscriptionHistory: () => void;
  isConfigured: boolean;
  isRealTimeMode: boolean;
  setRealTimeMode: (enabled: boolean) => void;
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
  const [sourceLanguage, setSourceLanguage] = useState("es-ES");
  const [targetLanguage, setTargetLanguage] = useState("en-US");
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguages[]>([]);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionResult[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState({
    originalText: "",
    translatedText: "",
  });
  const [activeSegments, setActiveSegments] = useState<AudioSegment[]>([]);
  const recognitionSessionRef = useRef<any>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isRealTimeMode, setRealTimeMode] = useState(false);
  const { toast } = useToast();

  // Clean up active segments periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setActiveSegments(prev => 
        prev.filter(segment => 
          segment.status !== SegmentStatus.COMPLETED && 
          Date.now() - segment.timestamp < 60000
        )
      );
    }, 10000);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Configure services when API key or region changes
  useEffect(() => {
    if (apiKey && region) {
      try {
        const config: AzureConfig = { key: apiKey, region };
        azureSpeechService.setConfig(config);
        realTimeTranslationService.setConfig(config);
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

  // Update language settings in real-time service when they change
  useEffect(() => {
    realTimeTranslationService.setSourceLanguage(sourceLanguage);
    realTimeTranslationService.setTargetLanguage(targetLanguage);
  }, [sourceLanguage, targetLanguage]);

  // Set up real-time translation event handlers
  useEffect(() => {
    const handleSegmentCreated = (segment: AudioSegment) => {
      setActiveSegments(prev => [...prev, segment]);
    };

    const handleSegmentUpdated = (segment: AudioSegment) => {
      setActiveSegments(prev => {
        return prev.map(s => s.id === segment.id ? segment : s);
      });
      
      // Update current transcription
      if (segment.originalText) {
        setCurrentTranscription(prev => ({
          originalText: segment.originalText || prev.originalText,
          translatedText: segment.translatedText || prev.translatedText
        }));
      }
    };

    const handleSegmentCompleted = (segment: AudioSegment) => {
      // Add to transcription history
      if (segment.originalText && segment.translatedText) {
        const result: TranscriptionResult = {
          originalText: segment.originalText,
          translatedText: segment.translatedText,
          fromLanguage: sourceLanguage,
          toLanguage: targetLanguage,
          timestamp: new Date(segment.timestamp),
        };
        setTranscriptionHistory(prev => [...prev, result]);
      }
      
      // Update active segments list
      setActiveSegments(prev => prev.map(s => s.id === segment.id ? segment : s));
    };

    const handleSessionStarted = () => {
      setState(AssistantState.LISTENING);
    };

    const handleSessionEnded = () => {
      setState(AssistantState.IDLE);
    };

    // Register event handlers
    realTimeTranslationService.on("segmentCreated", handleSegmentCreated);
    realTimeTranslationService.on("segmentUpdated", handleSegmentUpdated);
    realTimeTranslationService.on("segmentCompleted", handleSegmentCompleted);
    realTimeTranslationService.on("sessionStarted", handleSessionStarted);
    realTimeTranslationService.on("sessionEnded", handleSessionEnded);

    return () => {
      // Clean up event handlers
      realTimeTranslationService.off("segmentCreated", handleSegmentCreated);
      realTimeTranslationService.off("segmentUpdated", handleSegmentUpdated);
      realTimeTranslationService.off("segmentCompleted", handleSegmentCompleted); 
      realTimeTranslationService.off("sessionStarted", handleSessionStarted);
      realTimeTranslationService.off("sessionEnded", handleSessionEnded);
    };
  }, [sourceLanguage, targetLanguage]);

  // Original listening function for non-real-time mode
  const startRegularListening = async () => {
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

  // Start real-time translation session
  const startRealTimeTranslation = async () => {
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
      setActiveSegments([]);
      await realTimeTranslationService.startSession();
    } catch (error) {
      console.error("Error starting real-time translation:", error);
      setState(AssistantState.ERROR);
      toast({
        title: "Error",
        description: "Error al iniciar la traducción en tiempo real",
        variant: "destructive",
      });
    }
  };

  const startListening = async () => {
    if (isRealTimeMode) {
      await startRealTimeTranslation();
    } else {
      await startRegularListening();
    }
  };

  const stopListening = () => {
    if (isRealTimeMode) {
      realTimeTranslationService.stopSession();
    } else if (recognitionSessionRef.current) {
      recognitionSessionRef.current.stop();
      recognitionSessionRef.current = null;
      setState(AssistantState.IDLE);
    }
  };

  const clearTranscriptionHistory = () => {
    setTranscriptionHistory([]);
    setActiveSegments([]);
  };

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (recognitionSessionRef.current) {
        recognitionSessionRef.current.stop();
      }
      azureSpeechService.dispose();
      realTimeTranslationService.dispose();
    };
  }, []);

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
        activeSegments,
        setSourceLanguage,
        setTargetLanguage,
        startListening,
        stopListening,
        clearTranscriptionHistory,
        isConfigured,
        isRealTimeMode,
        setRealTimeMode,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};
