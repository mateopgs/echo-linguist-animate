
import React, { useState } from "react";
import { VoiceAssistantProvider } from "../contexts/VoiceAssistantContext";
import VoiceAssistant from "../components/VoiceAssistant";
import ConfigForm from "../components/ConfigForm";
import { useToast } from "../hooks/use-toast";

const Index = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  // This function would be called after successful configuration
  const handleConfigSuccess = () => {
    setIsConfigured(true);
    toast({
      title: "Configuration Successful",
      description: "Azure Speech Service is now configured.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-voiceAssistant-background">
      <div className="container mx-auto py-8 px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-voiceAssistant-primary mb-2">
            Real-time Voice Translator
          </h1>
          <p className="text-lg text-muted-foreground">
            Speak in one language, translate to another in real-time
          </p>
        </header>

        <VoiceAssistantProvider>
          <div className="flex flex-col items-center space-y-8">
            <VoiceAssistant />
            
            <div className="mt-8 w-full max-w-md">
              <details className="bg-white rounded-lg shadow-sm">
                <summary className="cursor-pointer p-4 text-voiceAssistant-primary font-medium">
                  Azure Speech Service Configuration
                </summary>
                <div className="p-4 pt-0">
                  <ConfigForm />
                </div>
              </details>
            </div>
            
            <div className="text-center text-sm text-muted-foreground mt-4">
              <p>
                This application uses Azure Speech Services for real-time speech recognition and translation.
              </p>
              <p className="mt-1">
                To use this app, you need to provide your Azure API key.
              </p>
            </div>
          </div>
        </VoiceAssistantProvider>
      </div>
    </div>
  );
};

export default Index;
