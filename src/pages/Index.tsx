
import React from "react";
import { VoiceAssistantProvider } from "../contexts/VoiceAssistantContext";
import VoiceAssistant from "../components/VoiceAssistant";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-voiceAssistant-background">
      <div className="container mx-auto py-8 px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-voiceAssistant-primary mb-2">
            Traductor de Voz en Tiempo Real
          </h1>
          <p className="text-lg text-muted-foreground">
            Habla en un idioma, traduce a otro en tiempo real
          </p>
        </header>

        <VoiceAssistantProvider>
          <div className="flex flex-col items-center space-y-8">
            <VoiceAssistant />
          </div>
        </VoiceAssistantProvider>
      </div>
    </div>
  );
};

export default Index;
