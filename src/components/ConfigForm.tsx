
import React, { useState, useEffect } from "react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Copy, Share2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const ConfigForm: React.FC = () => {
  const {
    isRealTimeMode,
    setRealTimeMode,
    isCapturingWhileSpeaking,
    setCapturingWhileSpeaking,
    segmentInterval,
    setSegmentInterval,
    sourceLanguage,
    targetLanguage
  } = useVoiceAssistant();

  const [shareUrl, setShareUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Generate a shareable URL with current settings
    const baseUrl = window.location.origin + window.location.pathname;
    const sourceLang = sourceLanguage.split('-')[0].toLowerCase();
    const targetLang = targetLanguage.split('-')[0].toLowerCase();
    const segmentSec = (segmentInterval / 1000).toFixed(1);
    
    const url = `${baseUrl}?speakin=${sourceLang}&translateto=${targetLang}&ss=${segmentSec}`;
    setShareUrl(url);
  }, [sourceLanguage, targetLanguage, segmentInterval]);

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSegmentInterval(parseInt(e.target.value));
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "URL copiada",
      description: "Enlace de configuración copiado al portapapeles",
    });
  };

  const shareConfig = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Traduce AI - Configuración',
          text: 'Usa este enlace para iniciar Traduce AI con mi configuración:',
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error al compartir:', err);
      }
    } else {
      copyShareUrl();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-6 space-y-6">
        <div className="flex items-center justify-center space-x-2">
          <Switch id="real-time-mode" checked={isRealTimeMode} onCheckedChange={setRealTimeMode} />
          <Label htmlFor="real-time-mode">Real-time translation mode</Label>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Switch id="simultaneous-capture" checked={isCapturingWhileSpeaking} onCheckedChange={setCapturingWhileSpeaking} />
          <Label htmlFor="simultaneous-capture">Capture audio while speaking (overlap)</Label>
        </div>
        <div className="flex flex-col items-center justify-center space-y-1 w-full">
          <Label htmlFor="segment-interval">Segment interval: {segmentInterval / 1000} seconds</Label>
          <input
            type="range"
            id="segment-interval"
            min="100"
            max="3000"
            step="100"
            value={segmentInterval}
            onChange={handleIntervalChange}
            className="w-3/4"
          />
        </div>

        {/* New section for sharing configuration */}
        <div className="flex flex-col items-center justify-center space-y-3 w-full border-t pt-4">
          <Label className="text-center">Share this configuration</Label>
          <p className="text-xs text-center text-muted-foreground">
            This URL will auto-start translation with your current settings
          </p>
          <div className="flex items-center w-full">
            <Input value={shareUrl} readOnly className="text-xs" />
            <Button variant="outline" size="icon" className="ml-2" onClick={copyShareUrl}>
              <Copy size={16} />
            </Button>
            {navigator.share && (
              <Button variant="outline" size="icon" className="ml-2" onClick={shareConfig}>
                <Share2 size={16} />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
