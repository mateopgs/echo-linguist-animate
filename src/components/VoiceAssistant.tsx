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

  return (
    <Card onClick={handleToggleListen} className="w-screen h-screen shadow-lg cursor-pointer">
      <CardHeader
        style={{ background: 'linear-gradient(to right, white 0%, white 15%, #7c3aed 100%)' }}
        className="text-white rounded-t-lg px-3 py-2 sm:px-4 sm:py-3 shadow-sm"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/72da0a50-4942-409a-b30c-5d599427fa00.png" 
              alt="Traduce AI Logo" 
              className="h-6 sm:h-8 md:h-10 mr-2"
            />
            {useAIEnhancement && (
              <span className="flex items-center text-xs sm:text-sm bg-violet-700 px-1.5 py-0.5 rounded-md">
                <Sparkles size={12} className="mr-1" />
                AI Enhanced
              </span>
            )}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-white h-8 w-8 p-0 sm:h-9 sm:w-9 sm:p-1">
                <Settings size={20} className="sm:size-24" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-sm md:max-w-lg">
              <ConfigDialogHeader>
                <ConfigDialogTitle>Settings</ConfigDialogTitle>
              </ConfigDialogHeader>
              <ConfigForm />
              <DialogClose asChild>
                <Button className="mt-4 w-full">Close</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 md:space-y-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="flex-1">
            <LanguageSelector
              languages={supportedLanguages}
              selectedLanguage={sourceLanguage}
              onChange={setSourceLanguage}
              label="Speak in"
            />
          </div>
          <div className="flex-1">
            <LanguageSelector
              languages={supportedLanguages}
              selectedLanguage={targetLanguage}
              onChange={setTargetLanguage}
              label="Translate to"
            />
          </div>
        </div>

        <div className="py-2 md:py-4">
          <AudioVisualizer state={state} />

          <div className="text-center text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
            {state === AssistantState.IDLE && "Ready to translate"}
            {state === AssistantState.LISTENING &&
              (isRealTimeMode
                ? isCapturingWhileSpeaking
                  ? "Capturing and translating continuously..."
                  : "Listening and translating in real-time..."
                : "Listening...")}
            {state === AssistantState.SPEAKING &&
              (isRealTimeMode && isCapturingWhileSpeaking
                ? "Playing translation (still capturing)"
                : "Speaking...")}
            {state === AssistantState.PROCESSING && (
              <span className="flex items-center justify-center">
                <Sparkles size={14} className="mr-1 text-violet-500" />
                "Enhancing translation with AI..."
              </span>
            )}
            {state === AssistantState.ERROR && "Error occurred"}
          </div>
        </div>

        {/* Se muestran ahora segmentos parciales inmediatamente, junto con los completos */}
        {isRealTimeMode && (
          <ActiveSegmentsList
            segments={sortedSegments}
            sourceLanguageName={getLanguageName(sourceLanguage)}
            targetLanguageName={getLanguageName(targetLanguage)}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceAssistant;
