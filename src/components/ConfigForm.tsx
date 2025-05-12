import React, { useState } from "react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";

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
    targetLanguage
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-6 space-y-6">
        <Tabs defaultValue="options" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="options">Opciones</TabsTrigger>
            <TabsTrigger value="voices">Voces</TabsTrigger>
          </TabsList>
          
          <TabsContent value="options" className="space-y-4 pt-4">
            <div className="flex items-center justify-center space-x-2">
              <Switch id="real-time-mode" checked={isRealTimeMode} onCheckedChange={setRealTimeMode} />
              <Label htmlFor="real-time-mode">Traducción en tiempo real</Label>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Switch id="simultaneous-capture" checked={isCapturingWhileSpeaking} onCheckedChange={setCapturingWhileSpeaking} />
              <Label htmlFor="simultaneous-capture">Capturar audio mientras habla (superposición)</Label>
            </div>
            <div className="flex flex-col items-center justify-center space-y-1 w-full">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="segment-interval">Intervalo de segmentos: {segmentInterval / 1000} segundos</Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    El tiempo en milisegundos para forzar nuevos segmentos durante la reproducción de audio.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              <Label htmlFor="initial-silence">Silencio inicial: {(initialSilenceTimeout/1000).toFixed(1)} segundos</Label>
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
              <Label htmlFor="end-silence">Silencio final: {endSilenceTimeout} ms</Label>
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
          </TabsContent>
          
          <TabsContent value="voices" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="voice-selector" className="mb-2 block">Voz para traducción ({targetLanguage})</Label>
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
