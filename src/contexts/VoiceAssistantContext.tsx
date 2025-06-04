import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { azureSpeechService } from "../services/azureSpeechService";
import { RealTimeTranslationService, SegmentStatus, AudioSegment } from "../services/realTimeTranslationService";
import { SupportedLanguages, TranscriptionResult, AssistantState, AzureConfig, VoiceOption } from "../types/voice-assistant";
import { useToast } from "../hooks/use-toast";
import { azureOpenAIService } from "../services/azureOpenAIService";

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
  initialSilenceTimeout: number;
  setInitialSilenceTimeout: (ms: number) => void;
  endSilenceTimeout: number;
  setEndSilenceTimeout: (ms: number) => void;
  availableVoices: VoiceOption[];
  selectedVoice: VoiceOption | null;
  setSelectedVoice: (voice: VoiceOption) => void;
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;
  useAIEnhancement: boolean;
  setUseAIEnhancement: (enabled: boolean) => void;
  // Nuevas funciones para control mejorado
  silenceTimeout: number;
  setSilenceTimeout: (ms: number) => void;
  getSegmentStats: () => { total: number; completed: number; errors: number };
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
  const [initialSilenceTimeout, setInitialSilenceTimeout] = useState(5000); // Silence detection start timeout (ms)
  const [endSilenceTimeout, setEndSilenceTimeout] = useState(500); // Silence detection end timeout (ms)
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState(1.1); // Valor por defecto para velocidad de la voz
  const [useAIEnhancement, setUseAIEnhancement] = useState(true);
  const [silenceTimeout, setSilenceTimeoutState] = useState(200); // Nuevo control de silencio optimizado
  const { toast } = useToast();

  // Create real-time translation service instance
  const realTimeTranslationServiceRef = useRef<RealTimeTranslationService | null>(null);
  
  // Cola de síntesis para manejar múltiples traducciones
  const synthesisQueueRef = useRef<Array<{ text: string; language: string; segmentId: number }>>([]);
  const isSynthesizingRef = useRef(false);

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
  
  // Monitorear cambios en la velocidad de voz
  useEffect(() => {
    console.log("Voice speed changed:", voiceSpeed);
    azureSpeechService.setVoiceSpeed(voiceSpeed);
  }, [voiceSpeed]);

  // Apply segment interval to the service when it changes
  useEffect(() => {
    console.log("Setting segment interval to:", segmentInterval);
  }, [segmentInterval]);

  // Update silence detection timeouts in the service
  useEffect(() => {
    console.log(`Setting silence timeouts: initial=${initialSilenceTimeout}ms, end=${endSilenceTimeout}ms`);
  }, [initialSilenceTimeout, endSilenceTimeout]);

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
        
        // Reinitialize real-time service with new config
        if (realTimeTranslationServiceRef.current) {
          realTimeTranslationServiceRef.current = new RealTimeTranslationService(apiKey, region, sourceLanguage, targetLanguage);
        }
        
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
    if (realTimeTranslationServiceRef.current) {
      realTimeTranslationServiceRef.current.setLanguages(sourceLanguage, targetLanguage);
    }
    
    // Update selected voice when target language changes
    if (availableVoices.length > 0) {
      const targetLangCode = targetLanguage.split('-')[0];
      const voiceForLanguage = availableVoices.find(v => v.id.startsWith(targetLangCode));
      if (voiceForLanguage && (!selectedVoice || !selectedVoice.id.startsWith(targetLangCode))) {
        console.log(`Changing voice to match target language: ${voiceForLanguage.name}`);
        setSelectedVoice(voiceForLanguage);
        azureSpeechService.setVoice(voiceForLanguage);
      }
    }
  }, [sourceLanguage, targetLanguage, availableVoices, selectedVoice]);

  // Update voice when it changes
  useEffect(() => {
    if (selectedVoice) {
      console.log(`Setting voice: ${selectedVoice.name} (${selectedVoice.id})`);
      azureSpeechService.setVoice(selectedVoice);
    }
  }, [selectedVoice]);

  // Función mejorada para procesar la cola de síntesis
  const processSynthesisQueue = async () => {
    if (isSynthesizingRef.current || synthesisQueueRef.current.length === 0) {
      return;
    }

    isSynthesizingRef.current = true;
    const item = synthesisQueueRef.current.shift();
    
    if (!item) {
      isSynthesizingRef.current = false;
      return;
    }

    try {
      console.log(`Sintetizando segmento ${item.segmentId}: ${item.text}`);
      
      // Solo cambiar estado a SPEAKING si no estamos capturando mientras hablamos
      if (!isCapturingWhileSpeaking) {
        setState(AssistantState.SPEAKING);
      }

      const audioBuffer = await azureSpeechService.synthesizeSpeech(item.text, item.language);
      await azureSpeechService.playAudio(audioBuffer);
      
      console.log(`Reproducción completada para segmento ${item.segmentId}`);

    } catch (error) {
      console.error(`Error sintetizando segmento ${item.segmentId}:`, error);
      toast({
        title: "Error",
        description: `Error al sintetizar el segmento ${item.segmentId}`,
        variant: "destructive",
      });
    } finally {
      isSynthesizingRef.current = false;
      
      // Si no estamos capturando mientras hablamos, volver a LISTENING
      if (!isCapturingWhileSpeaking && realTimeTranslationServiceRef.current?.isCurrentlyListening()) {
        setState(AssistantState.LISTENING);
      } else if (!realTimeTranslationServiceRef.current?.isCurrentlyListening()) {
        setState(AssistantState.IDLE);
      }

      // Procesar siguiente elemento en la cola
      setTimeout(() => processSynthesisQueue(), 100);
    }
  };

  // Set up real-time translation event handlers
  useEffect(() => {
    if (!realTimeTranslationServiceRef.current) return;

    const service = realTimeTranslationServiceRef.current;

    const handleSegmentUpdate = (segment: AudioSegment) => {
      console.log(`Segmento actualizado: ${segment.id} (${segment.status})`);
      
      // Actualizar segmentos activos
      setActiveSegments(prev => {
        const existingIndex = prev.findIndex(s => s.id === segment.id);
        let newSegments: AudioSegment[];
        
        if (existingIndex !== -1) {
          newSegments = [...prev];
          newSegments[existingIndex] = segment;
        } else {
          newSegments = [...prev, segment];
        }
        
        return newSegments.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      // Actualizar transcripción actual
      if (segment.originalText) {
        setCurrentTranscription({
          originalText: segment.originalText,
          translatedText: segment.translatedText || ''
        });
      }

      // Manejar segmentos completados para síntesis automática
      if (segment.status === SegmentStatus.COMPLETED && 
          segment.originalText && 
          segment.translatedText && 
          segment.translatedText.trim() !== '') {
        
        console.log(`Segmento completado, agregando a cola de síntesis: ${segment.id}`);
        
        // Agregar al historial
        const result: TranscriptionResult = {
          originalText: segment.originalText,
          translatedText: segment.translatedText,
          fromLanguage: sourceLanguage,
          toLanguage: targetLanguage,
          timestamp: new Date(segment.timestamp),
        };
        
        setTranscriptionHistory(prev => {
          const exists = prev.some(r => 
            r.originalText === result.originalText && 
            Math.abs(r.timestamp.getTime() - result.timestamp.getTime()) < 1000
          );
          
          if (exists) return prev;
          return [...prev, result].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });

        // Agregar a la cola de síntesis
        synthesisQueueRef.current.push({
          text: segment.translatedText,
          language: targetLanguage,
          segmentId: segment.id
        });

        // Procesar cola de síntesis
        processSynthesisQueue();
      }

      // Manejar errores
      if (segment.status === SegmentStatus.ERROR) {
        toast({
          title: "Error en segmento",
          description: `Error en el segmento ${segment.id}: ${segment.translatedText}`,
          variant: "destructive",
        });
      }
    };

    const handleError = (error: string) => {
      console.error("Error en traducción en tiempo real:", error);
      setState(AssistantState.ERROR);
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    };

    service.setCallbacks(handleSegmentUpdate, handleError);

    return () => {
      // Cleanup si es necesario
    };
  }, [sourceLanguage, targetLanguage, toast, isCapturingWhileSpeaking]);

  // Update language settings in real-time service when they change
  useEffect(() => {
    console.log(`Setting languages: source=${sourceLanguage}, target=${targetLanguage}`);
    if (realTimeTranslationServiceRef.current) {
      realTimeTranslationServiceRef.current.setLanguages(sourceLanguage, targetLanguage);
    }
    
    // Update selected voice when target language changes
    if (availableVoices.length > 0) {
      const targetLangCode = targetLanguage.split('-')[0];
      const voiceForLanguage = availableVoices.find(v => v.id.startsWith(targetLangCode));
      if (voiceForLanguage && (!selectedVoice || !selectedVoice.id.startsWith(targetLangCode))) {
        console.log(`Changing voice to match target language: ${voiceForLanguage.name}`);
        setSelectedVoice(voiceForLanguage);
        azureSpeechService.setVoice(voiceForLanguage);
      }
    }
  }, [sourceLanguage, targetLanguage, availableVoices, selectedVoice]);

  // Update voice when it changes
  useEffect(() => {
    if (selectedVoice) {
      console.log(`Setting voice: ${selectedVoice.name} (${selectedVoice.id})`);
      azureSpeechService.setVoice(selectedVoice);
    }
  }, [selectedVoice]);

  // Configurar servicio de traducción en tiempo real con configuración mejorada
  useEffect(() => {
    if (apiKey && region && realTimeTranslationServiceRef.current) {
      try {
        // Configurar servicio con nuevos parámetros
        realTimeTranslationServiceRef.current.setLanguages(sourceLanguage, targetLanguage);
        realTimeTranslationServiceRef.current.setAIEnhancement(useAIEnhancement);
        realTimeTranslationServiceRef.current.setSilenceTimeout(silenceTimeout);
        
        console.log(`Servicio configurado: silencio=${silenceTimeout}ms, AI=${useAIEnhancement}`);
      } catch (error) {
        console.error('Error configurando servicio en tiempo real:', error);
      }
    }
  }, [apiKey, region, sourceLanguage, targetLanguage, useAIEnhancement, silenceTimeout]);

  // Función mejorada para configurar timeout de silencio
  const setSilenceTimeout = (ms: number) => {
    const clampedValue = Math.max(100, Math.min(1000, ms)); // Entre 100ms y 1s
    setSilenceTimeoutState(clampedValue);
    if (realTimeTranslationServiceRef.current) {
      realTimeTranslationServiceRef.current.setSilenceTimeout(clampedValue);
    }
    console.log(`Timeout de silencio actualizado: ${clampedValue}ms`);
  };

  // Función para obtener estadísticas de segmentos
  const getSegmentStats = () => {
    if (realTimeTranslationServiceRef.current) {
      return realTimeTranslationServiceRef.current.getSegmentStats();
    }
    return { total: 0, completed: 0, errors: 0 };
  };

  // Manejo mejorado de segmentos con orden cronológico garantizado
  useEffect(() => {
    const handleSegmentUpdate = (segment: AudioSegment) => {
      console.log(`Segmento actualizado: ${segment.id} (${segment.status})`);
      
      setActiveSegments(prev => {
        const existingIndex = prev.findIndex(s => s.id === segment.id);
        let newSegments: AudioSegment[];
        
        if (existingIndex !== -1) {
          // Actualizar segmento existente
          newSegments = [...prev];
          newSegments[existingIndex] = segment;
        } else {
          // Agregar nuevo segmento
          newSegments = [...prev, segment];
        }
        
        // Ordenar por timestamp para garantizar orden cronológico
        return newSegments.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      // Actualizar transcripción actual con el segmento más reciente
      if (segment.originalText) {
        setCurrentTranscription({
          originalText: segment.originalText,
          translatedText: segment.translatedText || ''
        });
      }

      // Agregar al historial si está completado
      if (segment.status === SegmentStatus.COMPLETED && segment.originalText && segment.translatedText) {
        const result: TranscriptionResult = {
          originalText: segment.originalText,
          translatedText: segment.translatedText,
          fromLanguage: sourceLanguage,
          toLanguage: targetLanguage,
          timestamp: new Date(segment.timestamp),
        };
        
        setTranscriptionHistory(prev => {
          // Evitar duplicados
          const exists = prev.some(r => 
            r.originalText === result.originalText && 
            Math.abs(r.timestamp.getTime() - result.timestamp.getTime()) < 1000
          );
          
          if (exists) return prev;
          
          return [...prev, result].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });
      }

      // Manejar errores
      if (segment.status === SegmentStatus.ERROR) {
        toast({
          title: "Error en segmento",
          description: `Error en el segmento ${segment.id}: ${segment.translatedText}`,
          variant: "destructive",
        });
      }
    };

    const handleError = (error: string) => {
      console.error("Error en traducción en tiempo real:", error);
      setState(AssistantState.ERROR);
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    };

    // Configurar callbacks
    if (realTimeTranslationServiceRef.current) {
      realTimeTranslationServiceRef.current.setCallbacks(handleSegmentUpdate, handleError);
    }

    return () => {
      // Cleanup si es necesario
    };
  }, [sourceLanguage, targetLanguage, toast]);

  // Función mejorada para iniciar traducción en tiempo real
  const startRealTimeTranslation = async () => {
    if (!isConfigured) {
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
      
      // Limpiar cola de síntesis
      synthesisQueueRef.current = [];
      isSynthesizingRef.current = false;
      
      // Limpiar historial de OpenAI y del servicio
      if (useAIEnhancement) {
        azureOpenAIService.clearHistory();
      }
      if (realTimeTranslationServiceRef.current) {
        realTimeTranslationServiceRef.current.clearHistory();
      }
      
      console.log(`Iniciando traducción en tiempo real. Captura mientras habla: ${isCapturingWhileSpeaking}`);
      if (realTimeTranslationServiceRef.current) {
        await realTimeTranslationServiceRef.current.startListening();
      }
      
    } catch (error) {
      console.error("Error iniciando traducción en tiempo real:", error);
      setState(AssistantState.ERROR);
      toast({
        title: "Error",
        description: "Error al iniciar la traducción en tiempo real",
        variant: "destructive",
      });
    }
  };

  const startListening = async () => {
    console.log("Iniciando escucha en modo tiempo real continuo");
    await startRealTimeTranslation();
  };

  const stopListening = () => {
    console.log("Deteniendo escucha...");
    if (realTimeTranslationServiceRef.current) {
      realTimeTranslationServiceRef.current.stopListening();
      
      // Limpiar cola de síntesis al detener
      synthesisQueueRef.current = [];
      isSynthesizingRef.current = false;
      
      setState(AssistantState.IDLE);
      
      const stats = getSegmentStats();
      console.log(`Sesión finalizada - Segmentos: ${stats.total}, Completados: ${stats.completed}, Errores: ${stats.errors}`);
    }
  };

  const clearTranscriptionHistory = () => {
    setTranscriptionHistory([]);
    setActiveSegments([]);
    if (realTimeTranslationServiceRef.current) {
      realTimeTranslationServiceRef.current.clearHistory();
    }
    console.log("Historial de transcripciones limpiado");
  };

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      console.log("Cleaning up voice assistant resources");
      if (recognitionSessionRef.current) {
        recognitionSessionRef.current.stop();
      }
      if (realTimeTranslationServiceRef.current) {
        realTimeTranslationServiceRef.current.stopListening();
      }
      azureSpeechService.dispose();
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
        initialSilenceTimeout,
        setInitialSilenceTimeout,
        endSilenceTimeout,
        setEndSilenceTimeout,
        availableVoices,
        selectedVoice,
        setSelectedVoice,
        voiceSpeed,
        setVoiceSpeed,
        useAIEnhancement,
        setUseAIEnhancement,
        silenceTimeout,
        setSilenceTimeout,
        getSegmentStats
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};
