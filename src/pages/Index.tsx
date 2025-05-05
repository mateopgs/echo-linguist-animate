
import React from "react";
import { VoiceAssistantProvider } from "../contexts/VoiceAssistantContext";
import VoiceAssistant from "../components/VoiceAssistant";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-voiceAssistant-background flex items-center justify-center px-2 sm:px-4 py-4">
      {/* Aplicamos un ancho máximo para dispositivos grandes */}
      <div className="w-full max-w-4xl">
        <VoiceAssistantProvider>
          <VoiceAssistant />
        </VoiceAssistantProvider>
      </div>
    </div>
  );
};

export default Index;
