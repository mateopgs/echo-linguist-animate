
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
      {/* Azure configuration is fixed in system; removed from form */}

      {/* Audio Devices Settings */}
      <AudioDeviceSelector
        selectedInputDevice={selectedInputDevice}
        selectedOutputDevice={selectedOutputDevice}
        onInputDeviceChange={setSelectedInputDevice}
        onOutputDeviceChange={setSelectedOutputDevice}
      />

      <Separator />

      {/* Translation Mode */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Translation Mode</h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="realTimeMode"
            checked={isRealTimeMode}
            onCheckedChange={setRealTimeMode}
          />
          <Label htmlFor="realTimeMode">Real-time Mode</Label>
        </div>
        
        {isRealTimeMode && (
          <div className="space-y-3 pl-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="capturingWhileSpeaking"
                checked={isCapturingWhileSpeaking}
                onCheckedChange={setCapturingWhileSpeaking}
              />
              <Label htmlFor="capturingWhileSpeaking">Continuous Capture</Label>
            </div>
            
            <div className="space-y-2">
            <Label>Segment interval: {segmentInterval}ms</Label>
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

      {/* Voice Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Voice Settings</h3>
        
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
              <SelectValue placeholder="Select voice" />
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
          <Label>Voice speed: {voiceSpeed}x</Label>
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

      {/* Advanced Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Advanced Settings</h3>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="aiEnhancement"
            checked={useAIEnhancement}
            onCheckedChange={setUseAIEnhancement}
          />
          <Label htmlFor="aiEnhancement">AI Enhancement</Label>
        </div>
        
        <div className="space-y-2">
          <Label>Initial silence timeout: {initialSilenceTimeout}ms</Label>
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
          <Label>End silence timeout: {endSilenceTimeout}ms</Label>
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
