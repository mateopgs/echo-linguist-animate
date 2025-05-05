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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Configuración</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch id="real-time-mode" checked={isRealTimeMode} onCheckedChange={setRealTimeMode} />
            <Label htmlFor="real-time-mode">Modo de traducción en tiempo real</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="simultaneous-capture" checked={isCapturingWhileSpeaking} onCheckedChange={setCapturingWhileSpeaking} />
            <Label htmlFor="simultaneous-capture">Capturar audio mientras habla (superposición)</Label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="segment-interval">Intervalo de segmentación: {segmentInterval / 1000} segundos</Label>
            <input
              type="range"
              id="segment-interval"
              min="1000"
              max="10000"
              step="1000"
              value={segmentInterval}
              onChange={handleIntervalChange}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
