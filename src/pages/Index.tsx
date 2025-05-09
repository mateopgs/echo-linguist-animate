
import React, { useEffect, useState } from "react";
import { VoiceAssistantProvider } from "../contexts/VoiceAssistantContext";
import VoiceAssistant from "../components/VoiceAssistant";
import { useToast } from "../hooks/use-toast";

const Index = () => {
  const [urlParams, setUrlParams] = useState<URLSearchParams | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    // Parse URL parameters when component mounts
    const params = new URLSearchParams(window.location.search);
    console.log("URL parameters detected:", params.toString());
    
    // Only set parameters if at least one valid parameter exists
    if (params.has('speakin') || params.has('translateto') || params.has('ss')) {
      setUrlParams(params);
      
      // Notify user that auto-start is being attempted
      toast({
        title: "Auto-start",
        description: "Iniciando traducción automáticamente con parámetros de URL",
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-voiceAssistant-background flex items-center justify-center px-2 sm:px-4 py-4">
      <div className="w-full max-w-4xl">
        <VoiceAssistantProvider>
          <VoiceAssistant urlParams={urlParams} />
        </VoiceAssistantProvider>
      </div>
    </div>
  );
};

export default Index;
