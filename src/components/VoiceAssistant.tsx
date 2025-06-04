
import React, { useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Mic, MicOff, Volume, Settings, Sparkles } from "lucide-react";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { AssistantState } from "../types/voice-assistant";
import AudioVisualizer from "./AudioVisualizer";
import TranscriptionDisplay from "./TranscriptionDisplay";
import LanguageSelector from "./LanguageSelector";
import ActiveSegmentsList from "./ActiveSegmentsList";
import { Dialog, DialogTrigger, DialogContent, DialogHeader as ConfigDialogHeader, DialogTitle as ConfigDialogTitle, DialogClose } from "./ui/dialog";
import ConfigForm from "./ConfigForm";

const VoiceAssistant: React.FC = () => {
  const {
    state,
    sourceLanguage,
    targetLanguage,
    supportedLanguages,
    currentTranscription,
    activeSegments,
    setSourceLanguage,
    setTargetLanguage,
    startListening,
    stopListening,
    isRealTimeMode,
    setRealTimeMode,
    isCapturingWhileSpeaking,
    setCapturingWhileSpeaking,
    segmentInterval,
    setSegmentInterval,
    useAIEnhancement
  } = useVoiceAssistant();

  const handleToggleListen = () => {
    if (state === AssistantState.LISTENING) {
      stopListening();
    } else if (state === AssistantState.IDLE) {
      startListening();
    }
  };

  // Find language names for display
  const getLanguageName = (code: string) => {
    const language = supportedLanguages.find((lang) => lang.code === code);
    return language ? language.name : code;
  };

  // Agregamos logs para depuración
  useEffect(() => {
    console.log("Current state:", state);
    console.log("Active segments:", activeSegments);
    console.log("Current transcription:", currentTranscription);
    console.log("Real-time mode:", isRealTimeMode);
  }, [state, activeSegments, currentTranscription, isRealTimeMode]);

  // Filtrar segmentos parciales para mostrarlos primero, seguidos de los completos
  const sortedSegments = [...activeSegments].sort((a, b) => {
    // Priorizar segmentos parciales que están siendo procesados
    if (a.isPartial && !b.isPartial) return -1;
    if (!a.isPartial && b.isPartial) return 1;
    // Luego ordenar por timestamp (más recientes primero)
    return b.timestamp - a.timestamp;
  });

  // Función para obtener el estado de descripción mejorado
  const getStatusText = () => {
    if (state === AssistantState.IDLE) return "Listo para traducir";
    
    if (state === AssistantState.LISTENING) {
      if (isCapturingWhileSpeaking) {
        return "Capturando y traduciendo continuamente...";
      }
      return "Escuchando y traduciendo en tiempo real...";
    }
    
    if (state === AssistantState.SPEAKING) {
      if (isCapturingWhileSpeaking) {
        return "Reproduciendo traducción (aún capturando)";
      }
      return "Reproduciendo...";
    }
    
    if (state === AssistantState.PROCESSING) {
      return (
        <span className="flex items-center justify-center">
          <Sparkles size={16} className="mr-2 text-violet-500" />
          "Mejorando traducción con IA..."
        </span>
      );
    }
    
    if (state === AssistantState.ERROR) return "Error ocurrido";
    
    return "";
  };

  return (
    <div className="w-full max-w-none">
      <Card className="w-full shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          className="text-white rounded-t-lg px-4 py-4 sm:px-6 sm:py-5 shadow-lg"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/72da0a50-4942-409a-b30c-5d599427fa00.png" 
                alt="Traduce AI Logo" 
                className="h-8 sm:h-10 md:h-12 lg:h-14"
              />
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Traduce AI</h1>
                <div className="flex items-center space-x-2">
                  {useAIEnhancement && (
                    <span className="flex items-center text-xs sm:text-sm bg-purple-700/80 px-2 py-1 rounded-full backdrop-blur-sm">
                      <Sparkles size={14} className="mr-1" />
                      AI Enhanced
                    </span>
                  )}
                  {isCapturingWhileSpeaking && state === AssistantState.LISTENING && (
                    <span className="flex items-center text-xs sm:text-sm bg-green-700/80 px-2 py-1 rounded-full backdrop-blur-sm">
                      <Volume size={14} className="mr-1" />
                      Captura Continua
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" className="text-white h-10 w-10 p-0 sm:h-12 sm:w-12 hover:bg-white/20 transition-colors">
                  <Settings size={24} />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-lg mx-auto">
                <ConfigDialogHeader>
                  <ConfigDialogTitle>Configuración</ConfigDialogTitle>
                </ConfigDialogHeader>
                <ConfigForm />
                <DialogClose asChild>
                  <Button className="mt-4 w-full">Cerrar</Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Language Selectors - Responsive grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
            <div className="space-y-2">
              <LanguageSelector
                languages={supportedLanguages}
                selectedLanguage={sourceLanguage}
                onChange={setSourceLanguage}
                label="Hablar en"
              />
            </div>
            <div className="space-y-2">
              <LanguageSelector
                languages={supportedLanguages}
                selectedLanguage={targetLanguage}
                onChange={setTargetLanguage}
                label="Traducir a"
              />
            </div>
          </div>

          {/* Audio Visualizer Section */}
          <div className="py-6 lg:py-8">
            <AudioVisualizer state={state} />

            <div className="text-center text-sm lg:text-base text-muted-foreground mt-3 lg:mt-4 font-medium">
              {getStatusText()}
            </div>
          </div>

          {/* Active Segments - Full width on larger screens */}
          {isRealTimeMode && (
            <div className="w-full">
              <ActiveSegmentsList
                segments={sortedSegments}
                sourceLanguageName={getLanguageName(sourceLanguage)}
                targetLanguageName={getLanguageName(targetLanguage)}
              />
            </div>
          )}

          {/* Control Button */}
          <div className="flex justify-center pt-4 lg:pt-6">
            <Button
              onClick={handleToggleListen}
              size="lg"
              className={`rounded-full w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 p-0 shadow-xl transition-all duration-300 hover:scale-110 ${
                state === AssistantState.LISTENING
                  ? "bg-red-500 hover:bg-red-600 shadow-red-200"
                  : "bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-purple-200"
              }`}
            >
              {state === AssistantState.LISTENING ? (
                <MicOff size={32} className="lg:size-8" />
              ) : state === AssistantState.SPEAKING ? (
                <Volume size={32} className="lg:size-8" />
              ) : (
                <Mic size={32} className="lg:size-8" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceAssistant;
