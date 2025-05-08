import React, { useState } from "react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";

const ConfigForm: React.FC = () => {
  const {
    isRealTimeMode,
    setRealTimeMode,
    isCapturingWhileSpeaking,
    setCapturingWhileSpeaking,
    segmentInterval,
    setSegmentInterval
  } = useVoiceAssistant();

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSegmentInterval(parseInt(e.target.value));
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
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
