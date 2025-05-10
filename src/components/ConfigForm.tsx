
import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";

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
    wordCountThreshold,
    setWordCountThreshold,
  } = useVoiceAssistant();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Azure Speech API key"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="region">Region</Label>
        <Input
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. eastus"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="realtime-toggle">Real-time mode</Label>
          <Switch
            id="realtime-toggle"
            checked={isRealTimeMode}
            onCheckedChange={setRealTimeMode}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Enables continuous translation without waiting for pauses
        </p>
      </div>
      {isRealTimeMode && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="capturing-toggle">Capture while speaking</Label>
              <Switch
                id="capturing-toggle"
                checked={isCapturingWhileSpeaking}
                onCheckedChange={setCapturingWhileSpeaking}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Continue capturing speech while playing back translations
            </p>
          </div>
          <div className="space-y-2">
            <Label>Segment interval: {segmentInterval}ms</Label>
            <Slider
              value={[segmentInterval]}
              min={100}
              max={5000}
              step={100}
              onValueChange={(values) => setSegmentInterval(values[0])}
            />
            <p className="text-xs text-muted-foreground">
              Time between forced segment breaks (lower = more responsive)
            </p>
          </div>
          <div className="space-y-2">
            <Label>Word threshold: {wordCountThreshold} words</Label>
            <Slider
              value={[wordCountThreshold]}
              min={5}
              max={20}
              step={1}
              onValueChange={(values) => setWordCountThreshold(values[0])}
            />
            <p className="text-xs text-muted-foreground">
              Number of words before starting early translation
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ConfigForm;
