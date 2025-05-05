import React from "react";
import { VoiceAssistantProvider } from "../contexts/VoiceAssistantContext";
import VoiceAssistant from "../components/VoiceAssistant";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-voiceAssistant-background">
      <div className="container mx-auto py-8 px-4">
        <header className="text-center mb-8">
          {/* Title and subtitle removed */}
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
