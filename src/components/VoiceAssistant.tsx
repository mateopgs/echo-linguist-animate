import React, { useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Mic, MicOff, Volume, VolumeX, Settings } from "lucide-react";
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
    setSegmentInterval
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

  return (
    <Card className="w-full max-w-full sm:max-w-md md:max-w-2xl mx-auto shadow-lg">
      <CardHeader className="bg-voiceAssistant-primary text-white rounded-t-lg px-4 py-2">
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-xl md:text-2xl">Traduce AI</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-white">
                <Settings size={24} className="block md:inline" />
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
      <CardContent className="p-4 sm:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
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

        <div className="py-4">
          <AudioVisualizer state={state} />

          <div className="text-center text-sm text-muted-foreground mt-2">
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
            {state === AssistantState.PROCESSING && "Processing..."}
            {state === AssistantState.ERROR && "Error occurred"}
          </div>
        </div>

        <TranscriptionDisplay
          originalText={currentTranscription.originalText}
          translatedText={currentTranscription.translatedText}
          originalLanguage={getLanguageName(sourceLanguage)}
          targetLanguage={getLanguageName(targetLanguage)}
        />

        {isRealTimeMode && activeSegments.length > 0 && (
          <ActiveSegmentsList
            segments={activeSegments}
            sourceLanguageName={getLanguageName(sourceLanguage)}
            targetLanguageName={getLanguageName(targetLanguage)}
          />
        )}

        <div className="flex justify-center pt-2">
          <Button
            onClick={handleToggleListen}
            size="lg"
            className={`rounded-full w-16 h-16 p-0 ${
              state === AssistantState.LISTENING
                ? "bg-red-500 hover:bg-red-600"
                : "bg-voiceAssistant-primary hover:bg-voiceAssistant-primary/90"
            }`}
          >
            {state === AssistantState.LISTENING ? (
              <MicOff size={28} />
            ) : state === AssistantState.SPEAKING ? (
              <Volume size={28} />
            ) : (
              <Mic size={28} />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceAssistant;
