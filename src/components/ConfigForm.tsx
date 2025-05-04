
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";

const ConfigForm: React.FC = () => {
  const { apiKey, region, setApiKey, setRegion } = useVoiceAssistant();
  const [keyInput, setKeyInput] = useState(apiKey);
  const [regionInput, setRegionInput] = useState(region);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(keyInput);
    setRegion(regionInput);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Azure Speech Service Configuration</CardTitle>
        <CardDescription>
          Enter your Azure Speech Service API key and region to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium">
              API Key
            </label>
            <Input
              id="apiKey"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter your Azure Speech API key"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="region" className="text-sm font-medium">
              Region
            </label>
            <Input
              id="region"
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              placeholder="e.g., eastus, westeurope"
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Save Configuration
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
