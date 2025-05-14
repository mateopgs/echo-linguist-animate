
import React, { useState } from "react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { Slider } from "./ui/slider";
import { HelpCircle, Info } from "lucide-react";

const ConfigForm: React.FC = () => {
  const {
    isRealTimeMode,
    setRealTimeMode,
    isCapturingWhileSpeaking,
    setCapturingWhileSpeaking,
    segmentInterval,
    setSegmentInterval,
    initialSilenceTimeout,
    setInitialSilenceTimeout,
    endSilenceTimeout,
    setEndSilenceTimeout,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    targetLanguage,
    voiceSpeed,
    setVoiceSpeed
  } = useVoiceAssistant();

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSegmentInterval(parseInt(e.target.value));
  };

  // Agrupar voces por idioma para organizar la selección
  const voicesByLanguage = React.useMemo(() => {
    if (!availableVoices || availableVoices.length === 0) return {};
    
    return availableVoices.reduce((acc: Record<string, typeof availableVoices>, voice) => {
      const langCode = voice.id.split('-')[0];
      if (!acc[langCode]) {
        acc[langCode] = [];
      }
      acc[langCode].push(voice);
      return acc;
    }, {});
  }, [availableVoices]);

  // Filtrar voces por el idioma seleccionado como destino
  const targetLanguageVoices = React.useMemo(() => {
    if (!targetLanguage || !availableVoices) return [];
    
    const langCode = targetLanguage.split('-')[0];
    return availableVoices.filter(voice => voice.id.startsWith(langCode));
  }, [availableVoices, targetLanguage]);

  // Manejar cambio de velocidad de voz
  const handleVoiceSpeedChange = (value: number[]) => {
    setVoiceSpeed(value[0]);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-6 space-y-6">
        <Tabs defaultValue="options" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="options">Opciones</TabsTrigger>
            <TabsTrigger value="voices">Voces</TabsTrigger>
          </TabsList>
          
          <TabsContent value="options" className="space-y-4 pt-4">
            <TooltipProvider>
              <div className="flex items-center justify-center space-x-2">
                <Switch id="real-time-mode" checked={isRealTimeMode} onCheckedChange={setRealTimeMode} />
                <Label htmlFor="real-time-mode" className="flex items-center">
                  Traducción en tiempo real
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 text-white max-w-xs">
                      <p>Activa la traducción y reproducción mientras hablas, sin esperar a que termines tu frase completa.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
              
              <div className="flex items-center justify-center space-x-2">
                <Switch id="simultaneous-capture" checked={isCapturingWhileSpeaking} onCheckedChange={setCapturingWhileSpeaking} />
                <Label htmlFor="simultaneous-capture" className="flex items-center">
                  Capturar audio mientras habla
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 text-white max-w-xs">
                      <p>Permite seguir capturando tu voz mientras se reproduce la traducción, funcionando como una superposición de audio.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>

              <div className="flex flex-col items-center justify-center space-y-1 w-full">
                <div className="flex items-center justify-center w-full">
                  <Label htmlFor="segment-interval" className="flex items-center">
                    Intervalo de segmentos: {segmentInterval / 1000} segundos
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white max-w-xs">
                        <p>Determina cada cuánto tiempo se envía un segmento para su traducción en modo tiempo real. Un valor más pequeño da respuestas más rápidas pero puede causar más errores.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                </div>
                <input
                  type="range"
                  id="segment-interval"
                  min="50"
                  max="1000"
                  step="50"
                  value={segmentInterval}
                  onChange={handleIntervalChange}
                  className="w-3/4"
                />
                <span className="text-xs text-gray-500">Más corto = respuesta más rápida, puede causar más errores</span>
              </div>

              <div className="flex flex-col items-center justify-center space-y-1 w-full">
                <div className="flex items-center justify-center w-full">
                  <Label htmlFor="initial-silence" className="flex items-center">
                    Silencio inicial: {(initialSilenceTimeout/1000).toFixed(1)} segundos
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white max-w-xs">
                        <p>Tiempo máximo que el sistema esperará en silencio antes de empezar a detectar voz. Si no se detecta ninguna voz en este tiempo, la grabación se cancelará.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                </div>
                <input
                  type="range"
                  id="initial-silence"
                  min="1000"
                  max="10000"
                  step="500"
                  value={initialSilenceTimeout}
                  onChange={e => setInitialSilenceTimeout(parseInt(e.target.value))}
                  className="w-3/4"
                />
                <span className="text-xs text-gray-500">Tiempo máximo de espera antes de detectar inicio de habla.</span>
              </div>

              <div className="flex flex-col items-center justify-center space-y-1 w-full">
                <div className="flex items-center justify-center w-full">
                  <Label htmlFor="end-silence" className="flex items-center">
                    Silencio final: {endSilenceTimeout} ms
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white max-w-xs">
                        <p>Cantidad de silencio continuo necesaria para considerar que has terminado de hablar y finalizar un segmento de audio.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                </div>
                <input
                  type="range"
                  id="end-silence"
                  min="100"
                  max="2000"
                  step="100"
                  value={endSilenceTimeout}
                  onChange={e => setEndSilenceTimeout(parseInt(e.target.value))}
                  className="w-3/4"
                />
                <span className="text-xs text-gray-500">Tiempo de silencio para marcar fin de segmento.</span>
              </div>

              <div className="flex flex-col items-center justify-center space-y-1 w-full">
                <div className="flex items-center justify-center w-full">
                  <Label htmlFor="voice-speed" className="flex items-center">
                    Velocidad de voz: {voiceSpeed.toFixed(1)}x
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white max-w-xs">
                        <p>Controla la velocidad a la que se reproduce la voz sintética. Valores más altos hacen que hable más rápido.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                </div>
                <Slider 
                  id="voice-speed"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[voiceSpeed]} 
                  onValueChange={handleVoiceSpeedChange}
                  className="w-3/4"
                />
                <span className="text-xs text-gray-500">Ajusta la velocidad de reproducción de la voz (0.5x - 2.0x)</span>
              </div>
            </TooltipProvider>
          </TabsContent>
          
          <TabsContent value="voices" className="space-y-4 pt-4">
            <TooltipProvider>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="voice-selector" className="mb-2 block flex items-center">
                    Voz para traducción ({targetLanguage})
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white max-w-xs">
                        <p>Selecciona la voz que reproducirá la traducción. Las voces Neural ofrecen mayor calidad y naturalidad.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select 
                    value={selectedVoice?.id || ''} 
                    onValueChange={(value) => {
                      const voice = availableVoices.find(v => v.id === value);
                      if (voice) setSelectedVoice(voice);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una voz" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetLanguageVoices.map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender}) 
                          {voice.isNeural && " - Neural"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TooltipProvider>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
