
import React from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Mic, MicOff, Volume, VolumeX } from "lucide-react";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { AssistantState } from "../types/voice-assistant";
import AudioVisualizer from "./AudioVisualizer";
import TranscriptionDisplay from "./TranscriptionDisplay";
import LanguageSelector from "./LanguageSelector";

const VoiceAssistant: React.FC = () => {
  const {
    state,
    sourceLanguage,
    targetLanguage,
    supportedLanguages,
    currentTranscription,
    setSourceLanguage,
    setTargetLanguage,
    startListening,
    stopListening,
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

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="bg-voiceAssistant-primary text-white rounded-t-lg">
        <CardTitle className="text-center text-2xl">Voice Translator</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
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
            {state === AssistantState.LISTENING && "Listening..."}
            {state === AssistantState.SPEAKING && "Speaking..."}
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
