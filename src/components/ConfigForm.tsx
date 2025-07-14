
import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import AudioDeviceSelector from "./AudioDeviceSelector";

const ConfigForm: React.FC = () => {
  const {
    apiKey,
    region,
    setApiKey,
    setRegion,
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
    voiceSpeed,
    setVoiceSpeed,
    useAIEnhancement,
    setUseAIEnhancement,
    selectedInputDevice,
    selectedOutputDevice,
    setSelectedInputDevice,
    setSelectedOutputDevice,
  } = useVoiceAssistant();

  const targetLanguageCode = selectedVoice?.locale?.split('-')[0] || 'en';
  const voicesForLanguage = availableVoices.filter(voice => 
    voice.locale?.startsWith(targetLanguageCode)
  );

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Configuración de Azure */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Configuración de Azure</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Tu API Key de Azure Speech"
            />
          </div>
          <div>
            <Label htmlFor="region">Región</Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="eastus2"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Configuración de Dispositivos de Audio */}
      <AudioDeviceSelector
        selectedInputDevice={selectedInputDevice}
        selectedOutputDevice={selectedOutputDevice}
        onInputDeviceChange={setSelectedInputDevice}
        onOutputDeviceChange={setSelectedOutputDevice}
      />

      <Separator />

      {/* Configuración de Modo */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Modo de Traducción</h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="realTimeMode"
            checked={isRealTimeMode}
            onCheckedChange={setRealTimeMode}
          />
          <Label htmlFor="realTimeMode">Modo tiempo real</Label>
        </div>
        
        {isRealTimeMode && (
          <div className="space-y-3 pl-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="capturingWhileSpeaking"
                checked={isCapturingWhileSpeaking}
                onCheckedChange={setCapturingWhileSpeaking}
              />
              <Label htmlFor="capturingWhileSpeaking">Captura continua</Label>
            </div>
            
            <div className="space-y-2">
              <Label>Intervalo de segmento: {segmentInterval}ms</Label>
              <Slider
                value={[segmentInterval]}
                onValueChange={(value) => setSegmentInterval(value[0])}
                max={5000}
                min={100}
                step={100}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Configuración de Voz */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Configuración de Voz</h3>
        
        {voicesForLanguage.length > 0 && (
          <div className="space-y-2">
            <Label>Voz</Label>
            <Select
              value={selectedVoice?.id || ""}
              onValueChange={(voiceId) => {
                const voice = availableVoices.find(v => v.id === voiceId);
                if (voice) setSelectedVoice(voice);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar voz" />
              </SelectTrigger>
              <SelectContent>
                {voicesForLanguage.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="space-y-2">
          <Label>Velocidad de voz: {voiceSpeed}x</Label>
          <Slider
            value={[voiceSpeed]}
            onValueChange={(value) => setVoiceSpeed(value[0])}
            max={2.0}
            min={0.5}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>

      <Separator />

      {/* Configuración Avanzada */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Configuración Avanzada</h3>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="aiEnhancement"
            checked={useAIEnhancement}
            onCheckedChange={setUseAIEnhancement}
          />
          <Label htmlFor="aiEnhancement">Mejora con IA</Label>
        </div>
        
        <div className="space-y-2">
          <Label>Tiempo de silencio inicial: {initialSilenceTimeout}ms</Label>
          <Slider
            value={[initialSilenceTimeout]}
            onValueChange={(value) => setInitialSilenceTimeout(value[0])}
            max={10000}
            min={1000}
            step={500}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Tiempo de silencio final: {endSilenceTimeout}ms</Label>
          <Slider
            value={[endSilenceTimeout]}
            onValueChange={(value) => setEndSilenceTimeout(value[0])}
            max={2000}
            min={100}
            step={100}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default ConfigForm;
