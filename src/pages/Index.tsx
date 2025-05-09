
import React, { useEffect, useState } from "react";
import { VoiceAssistantProvider } from "../contexts/VoiceAssistantContext";
import VoiceAssistant from "../components/VoiceAssistant";
import { useToast } from "../hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { InfoCircle } from "lucide-react";

const Index = () => {
  const [urlParams, setUrlParams] = useState<URLSearchParams | undefined>(undefined);
  const { toast } = useToast();
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Parse URL parameters when component mounts
    const params = new URLSearchParams(window.location.search);
    console.log("URL parameters detected:", params.toString());
    
    // Only set parameters if at least one valid parameter exists
    // Check for all supported parameters
    if (params.has('speakin') || params.has('translateto') || params.has('ss')) {
      setUrlParams(params);
      
      // Notify user that auto-start is being attempted
      toast({
        title: "Auto-inicio",
        description: "Iniciando traducción automáticamente con parámetros de URL",
      });

      // Show guide if we have params
      setShowGuide(true);
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-voiceAssistant-background flex flex-col items-center justify-center px-2 sm:px-4 py-4">
      {showGuide && (
        <div className="w-full max-w-4xl mb-4">
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <InfoCircle className="h-4 w-4" />
            <AlertTitle>Inicio automático</AlertTitle>
            <AlertDescription>
              La traducción se iniciará automáticamente con los parámetros detectados.
              Si no funciona, revisa que los códigos de idioma sean correctos (ej: es, en, fr, de).
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div className="w-full max-w-4xl">
        <VoiceAssistantProvider>
          <VoiceAssistant urlParams={urlParams} />
        </VoiceAssistantProvider>
      </div>
    </div>
  );
};

export default Index;
