import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Phone, PhoneCall } from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface CallConfig {
  from_number: string;
  to_number: string;
  source_language: string;
  target_language: string;
  source_tts_provider: string;
  source_voice: string;
  target_tts_provider: string;
  target_voice: string;
  play_waiting_music: boolean;
}

const languages = [
  { code: "en-US", name: "English (US)" },
  { code: "de-DE", name: "German" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "it-IT", name: "Italian" },
  { code: "ro-RO", name: "Romanian" },
  { code: "pt-PT", name: "Portuguese" },
  { code: "el-GR", name: "Greek" },
  { code: "ja-JP", name: "Japanese" },
  { code: "zh-CN", name: "Chinese (Mandarin)" },
  { code: "ar-SA", name: "Arabic" }
];

const ttsProviders = [
  { value: "ElevenLabs", name: "ElevenLabs" },
  { value: "Google", name: "Google" },
  { value: "Amazon", name: "Amazon" }
];

const PhoneCallForm: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [config, setConfig] = useState<CallConfig>({
    from_number: "",
    to_number: "",
    source_language: "en-US",
    target_language: "es-ES",
    source_tts_provider: "ElevenLabs",
    source_voice: "",
    target_tts_provider: "ElevenLabs",
    target_voice: "",
    play_waiting_music: false
  });

  const handleInputChange = (field: keyof CallConfig, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartCall = async () => {
    if (!config.from_number.trim() || !config.to_number.trim()) {
      toast({
        title: "Error",
        description: "Please enter both phone numbers",
        variant: "destructive"
      });
      return;
    }

    // Validate phone number format
    if (!config.from_number.startsWith('+') || !config.to_number.startsWith('+')) {
      toast({
        title: "Error",
        description: "Phone numbers must start with + (international format)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log("Initiating call with config:", config);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('https://pgs-call-translate.azurewebsites.net/initiate-call', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(config),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch (e) {
          console.log("Could not parse error response as JSON");
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Call result:", result);
      
      toast({
        title: "Call initiated successfully!",
        description: `Session ID: ${result.session_id}`,
      });
      
    } catch (error) {
      console.error("Call initiation error:", error);
      
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timeout - the service may be unavailable";
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = "Network error - check your internet connection or the service may be down";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Call failed",
        description: `Error: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-voiceAssistant-text">
          <PhoneCall className="h-6 w-6" />
          ConvRelay AI Translate
        </CardTitle>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
          <h4 className="font-semibold text-blue-800 mb-2">How It Works</h4>
          <p className="text-sm text-blue-700 mb-2">
            <strong>Setup:</strong> Configure two participants below—the Source person and the Target person.
          </p>
          <p className="text-sm text-blue-700 mb-1"><strong>Call Process:</strong></p>
          <ul className="text-sm text-blue-700 list-disc ml-4">
            <li>Each participant will receive a call from the system to their phone number.</li>
            <li>The Source speaks and hears in the Source language.</li>
            <li>The Target speaks and hears in the Target language.</li>
            <li>All speech is automatically translated in real time.</li>
          </ul>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Enter phone numbers in international format (e.g., +1234567890).
          </p>
        </div>

        {/* Participant 1 (Source) */}
        <fieldset className="border border-gray-300 p-4 rounded-lg">
          <legend className="font-semibold px-2">Participant 1 (Source) Settings</legend>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number:</Label>
              <Input
                type="tel"
                placeholder="+1234567890"
                value={config.from_number}
                onChange={(e) => handleInputChange("from_number", e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Language:</Label>
              <Select value={config.source_language} onValueChange={(value) => handleInputChange("source_language", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>TTS Provider:</Label>
              <Select value={config.source_tts_provider} onValueChange={(value) => handleInputChange("source_tts_provider", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ttsProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Voice (optional):</Label>
              <Input
                type="text"
                placeholder="Voice ID (default if empty)"
                value={config.source_voice}
                onChange={(e) => handleInputChange("source_voice", e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* Participant 2 (Target) */}
        <fieldset className="border border-gray-300 p-4 rounded-lg">
          <legend className="font-semibold px-2">Participant 2 (Target) Settings</legend>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number:</Label>
              <Input
                type="tel"
                placeholder="+1234567890"
                value={config.to_number}
                onChange={(e) => handleInputChange("to_number", e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Language:</Label>
              <Select value={config.target_language} onValueChange={(value) => handleInputChange("target_language", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>TTS Provider:</Label>
              <Select value={config.target_tts_provider} onValueChange={(value) => handleInputChange("target_tts_provider", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ttsProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Voice (optional):</Label>
              <Input
                type="text"
                placeholder="Voice ID (default if empty)"
                value={config.target_voice}
                onChange={(e) => handleInputChange("target_voice", e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* Audio Settings */}
        <fieldset className="border border-gray-300 p-4 rounded-lg">
          <legend className="font-semibold px-2">Audio Settings</legend>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="play_waiting_music"
              checked={config.play_waiting_music}
              onCheckedChange={(checked) => handleInputChange("play_waiting_music", checked as boolean)}
            />
            <Label htmlFor="play_waiting_music">Play waiting music during translation</Label>
          </div>
        </fieldset>

        <Button 
          onClick={handleStartCall}
          disabled={loading}
          className="w-full bg-voiceAssistant-primary hover:bg-voiceAssistant-primary/90 text-white"
          size="lg"
        >
          <Phone className="mr-2 h-4 w-4" />
          {loading ? "Initiating Call..." : "Initiate Translation Call"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PhoneCallForm;