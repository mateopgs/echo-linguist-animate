
import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { azureSpeechService } from "../services/azureSpeechService";
import { realTimeTranslationService, SegmentStatus, AudioSegment } from "../services/realTimeTranslationService";
import { SupportedLanguages, TranscriptionResult, AssistantState, AzureConfig, VoiceOption } from "../types/voice-assistant";
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
  isCapturingWhileSpeaking: boolean;
  setCapturingWhileSpeaking: (enabled: boolean) => void;
  segmentInterval: number;
  setSegmentInterval: (ms: number) => void;
  availableVoices: VoiceOption[];
  selectedVoice: VoiceOption | null;
  setSelectedVoice: (voice: VoiceOption) => void;
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
  const [isRealTimeMode, setRealTimeMode] = useState(true); // Activamos el modo en tiempo real por defecto
  const [isCapturingWhileSpeaking, setCapturingWhileSpeaking] = useState(true);
  const [segmentInterval, setSegmentInterval] = useState(200); // Reducido a 200ms por defecto para mayor rapidez
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const { toast } = useToast();

  // Monitorear cambios importantes con logs
  useEffect(() => {
    console.log("State changed:", state);
  }, [state]);
  
  useEffect(() => {
    console.log("Real-time mode changed:", isRealTimeMode);
  }, [isRealTimeMode]);
  
  useEffect(() => {
    console.log("Capturing while speaking changed:", isCapturingWhileSpeaking);
  }, [isCapturingWhileSpeaking]);

  // Apply segment interval to the service when it changes
  useEffect(() => {
    console.log("Setting segment interval to:", segmentInterval);
    realTimeTranslationService.setSegmentDuration(segmentInterval);
  }, [segmentInterval]);

  // Clean up active segments periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setActiveSegments(prev => 
        prev.filter(segment => 
          segment.status !== SegmentStatus.COMPLETED && 
          Date.now() - segment.timestamp < 30000 // Reducido a 30 segundos para limpiar más rápido
        )
      );
    }, 5000); // Aumentar frecuencia de limpieza
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Configure services when API key or region changes
  useEffect(() => {
    if (apiKey && region) {
      try {
        const config: AzureConfig = { key: apiKey, region };
        console.log("Configuring services with:", config);
        azureSpeechService.setConfig(config);
        realTimeTranslationService.setConfig(config);
        setIsConfigured(true);
        
        // Load supported languages
        azureSpeechService
          .getSupportedLanguages()
          .then((languages) => {
            console.log("Loaded supported languages:", languages);
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
        
        // Load available voices
        azureSpeechService
          .getSupportedVoices()
          .then((voices) => {
            console.log("Loaded supported voices:", voices);
            setAvailableVoices(voices);
            
            // Seleccionar una voz por defecto según el idioma destino
            if (voices.length > 0) {
              const defaultVoice = voices.find(v => v.id.startsWith(targetLanguage.split('-')[0]));
              if (defaultVoice) {
                setSelectedVoice(defaultVoice);
                azureSpeechService.setVoice(defaultVoice);
                realTimeTranslationService.setVoice(defaultVoice);
              }
            }
          })
          .catch((error) => {
            console.error("Failed to load supported voices:", error);
            toast({
              title: "Error",
              description: "No se pudieron cargar las voces disponibles",
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
  }, [apiKey, region, toast, targetLanguage]);

  // Update language settings in real-time service when they change
  useEffect(() => {
    console.log(`Setting languages: source=${sourceLanguage}, target=${targetLanguage}`);
    realTimeTranslationService.setSourceLanguage(sourceLanguage);
    realTimeTranslationService.setTargetLanguage(targetLanguage);
    
    // Update selected voice when target language changes
    if (availableVoices.length > 0) {
      const targetLangCode = targetLanguage.split('-')[0];
      const voiceForLanguage = availableVoices.find(v => v.id.startsWith(targetLangCode));
      if (voiceForLanguage && (!selectedVoice || !selectedVoice.id.startsWith(targetLangCode))) {
        console.log(`Changing voice to match target language: ${voiceForLanguage.name}`);
        setSelectedVoice(voiceForLanguage);
        azureSpeechService.setVoice(voiceForLanguage);
        realTimeTranslationService.setVoice(voiceForLanguage);
      }
    }
  }, [sourceLanguage, targetLanguage, availableVoices, selectedVoice]);

  // Update voice when it changes
  useEffect(() => {
    if (selectedVoice) {
      console.log(`Setting voice: ${selectedVoice.name} (${selectedVoice.id})`);
      azureSpeechService.setVoice(selectedVoice);
      realTimeTranslationService.setVoice(selectedVoice);
    }
  }, [selectedVoice]);

  // Set up real-time translation event handlers
  useEffect(() => {
    const handleSegmentCreated = (segment: AudioSegment) => {
      console.log("Segment created:", segment);
      setActiveSegments(prev => [...prev, segment]);
    };

    const handleSegmentUpdated = (segment: AudioSegment) => {
      console.log("Segment updated:", segment);
      
      if (segment.id === -1) {
        // Esto es una actualización temporal de reconocimiento en curso
        if (segment.originalText) {
          setCurrentTranscription(prev => ({
            originalText: segment.originalText || prev.originalText,
            translatedText: segment.translatedText || prev.translatedText
          }));
        }
        return;
      }
      
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
      console.log("Segment completed:", segment);
      
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
    
    const handleSegmentError = ({ segment, error }: { segment: AudioSegment, error: Error }) => {
      console.error(`Error in segment ${segment.id}:`, error);
      
      toast({
        title: "Error en la traducción",
        description: `Error en el segmento ${segment.id}: ${error.message}`,
        variant: "destructive",
      });
      
      // Update segment status in the UI
      setActiveSegments(prev => prev.map(s => s.id === segment.id ? { ...s, status: SegmentStatus.ERROR } : s));
    };

    const handleSessionStarted = () => {
      console.log("Real-time translation session started");
      setState(AssistantState.LISTENING);
    };

    const handleSessionEnded = () => {
      console.log("Real-time translation session ended");
      setState(AssistantState.IDLE);
    };
    
    const handleSimultaneousCapture = (enabled: boolean) => {
      console.log("Simultaneous capture setting updated:", enabled);
      setCapturingWhileSpeaking(enabled);
    };

    // Register event handlers
    realTimeTranslationService.on("segmentCreated", handleSegmentCreated);
    realTimeTranslationService.on("segmentUpdated", handleSegmentUpdated);
    realTimeTranslationService.on("segmentCompleted", handleSegmentCompleted);
    realTimeTranslationService.on("segmentError", handleSegmentError);
    realTimeTranslationService.on("sessionStarted", handleSessionStarted);
    realTimeTranslationService.on("sessionEnded", handleSessionEnded);
    realTimeTranslationService.on("simultaneousCapture", handleSimultaneousCapture);

    return () => {
      // Clean up event handlers
      realTimeTranslationService.off("segmentCreated", handleSegmentCreated);
      realTimeTranslationService.off("segmentUpdated", handleSegmentUpdated);
      realTimeTranslationService.off("segmentCompleted", handleSegmentCompleted); 
      realTimeTranslationService.off("segmentError", handleSegmentError);
      realTimeTranslationService.off("sessionStarted", handleSessionStarted);
      realTimeTranslationService.off("sessionEnded", handleSessionEnded);
      realTimeTranslationService.off("simultaneousCapture", handleSimultaneousCapture);
    };
  }, [sourceLanguage, targetLanguage, toast]);

  // Effect to update the capturing while speaking setting
  useEffect(() => {
    if (isRealTimeMode) {
      console.log("Updating capturing while speaking setting:", isCapturingWhileSpeaking);
      realTimeTranslationService.enableCapturingWhileSpeaking(isCapturingWhileSpeaking);
    }
  }, [isCapturingWhileSpeaking, isRealTimeMode]);

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
          console.log("Interim recognition result:", interimResult);
          setCurrentTranscription((prev) => ({
            ...prev,
            originalText: interimResult,
          }));
        },
        async (originalText, translatedText) => {
          console.log("Final recognition result:", originalText);
          console.log("Translation:", translatedText);
          
          setState(AssistantState.PROCESSING);
          
          // Usamos directamente la traducción sin mejoras de LLM
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
            console.log("Synthesizing speech for:", translatedText);
            const audioBuffer = await azureSpeechService.synthesizeSpeech(
              translatedText,
              targetLanguage
            );
            console.log("Audio synthesized, playing...");
            await azureSpeechService.playAudio(audioBuffer);
            console.log("Audio playback completed");
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
      console.log("Starting real-time translation session...");
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
    console.log("Starting listening in mode:", isRealTimeMode ? "real-time" : "regular");
    if (isRealTimeMode) {
      await startRealTimeTranslation();
    } else {
      await startRegularListening();
    }
  };

  const stopListening = () => {
    console.log("Stopping listening in mode:", isRealTimeMode ? "real-time" : "regular");
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
      console.log("Cleaning up voice assistant resources");
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
        isCapturingWhileSpeaking,
        setCapturingWhileSpeaking,
        segmentInterval,
        setSegmentInterval,
        availableVoices,
        selectedVoice,
        setSelectedVoice
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};
