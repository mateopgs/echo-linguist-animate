
import React, { useState } from "react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "./ui/slider";

const ConfigForm: React.FC = () => {
  const {
    isRealTimeMode,
    setRealTimeMode,
    isCapturingWhileSpeaking,
    setCapturingWhileSpeaking,
    segmentInterval,
    setSegmentInterval,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    targetLanguage
  } = useVoiceAssistant();

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

  // Convertir el valor del intervalo para la interfaz de usuario
  const handleIntervalChange = (value: number[]) => {
    // El valor viene como un array porque el Slider de shadcn/ui funciona así
    setSegmentInterval(value[0]);
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
            <div className="flex items-center justify-center space-x-2">
              <Switch id="real-time-mode" checked={isRealTimeMode} onCheckedChange={setRealTimeMode} />
              <Label htmlFor="real-time-mode">Traducción en tiempo real</Label>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Switch id="simultaneous-capture" checked={isCapturingWhileSpeaking} onCheckedChange={setCapturingWhileSpeaking} />
              <Label htmlFor="simultaneous-capture">Capturar audio mientras habla (superposición)</Label>
            </div>
            <div className="flex flex-col items-center justify-center space-y-3 w-full">
              <div className="flex justify-between w-3/4">
                <Label htmlFor="segment-interval">Intervalo de segmentos:</Label>
                <span className="font-medium">{segmentInterval / 1000} seg</span>
              </div>
              <Slider
                id="segment-interval"
                min={50}
                max={1000}
                step={50}
                value={[segmentInterval]}
                onValueChange={handleIntervalChange}
                className="w-3/4"
              />
              <span className="text-xs text-gray-500 text-center">
                Más corto = respuesta más rápida, puede aumentar la sensibilidad
              </span>
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
