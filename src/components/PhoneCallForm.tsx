import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
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
    target_language: "en-US",
    source_tts_provider: "ElevenLabs",
    source_voice: "",
    target_tts_provider: "ElevenLabs",
    target_voice: ""
  });

  const handleInputChange = (field: keyof CallConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartCall = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* How It Works Section */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-left">How It Works</CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-6">
              <div className="space-y-4 text-sm">
                <p><strong>Setup:</strong> Configure two participants below - the <strong>Source</strong> person and the <strong>Target</strong> person. Each participant gets their own phone number and language settings.</p>
                
                <div>
                  <p><strong>Call Process:</strong></p>
                  <ul className="ml-5 mt-2 space-y-1 list-disc">
                    <li>Each participant will receive a call from the system to their respective number</li>
                    <li>The <strong>Source number</strong> will hear and speak in the <strong>Source language</strong></li>
                    <li>The <strong>Target number</strong> will hear and speak in the <strong>Target language</strong></li>
                    <li>All speech is automatically translated in real-time between the two languages</li>
                  </ul>
                </div>
                
                <div>
                  <p><strong>Speaking Guidelines:</strong></p>
                  <ul className="ml-5 mt-2 space-y-1 list-disc">
                    <li>Take turns speaking with natural pauses at the end of sentences</li>
                    <li>Wait patiently for translation to complete before continuing</li>
                    <li>Speak clearly and at a normal pace</li>
                    <li>The system automatically detects when you finish speaking</li>
                  </ul>
                </div>
                
                <p><strong>Example:</strong> If Source is English and Target is Spanish, the English speaker will hear Spanish translations, and the Spanish speaker will hear English translations.</p>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Enter phone numbers in international format (e.g., +1234567890)
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleStartCall} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Participant 1 (Source) */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Participant 1 (Source)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="from_number">Phone Number:</Label>
                <Input
                  id="from_number"
                  type="tel"
                  placeholder="+1234567890"
                  value={config.from_number}
                  onChange={(e) => handleInputChange('from_number', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Must be in E.164 format (e.g., +14155552671)</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source_language">Language:</Label>
                <Select value={config.source_language} onValueChange={(value) => handleInputChange('source_language', value)}>
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

              <Collapsible>
                <CollapsibleTrigger className="w-full text-left">
                  <p className="cursor-pointer font-semibold text-purple-600 hover:text-purple-700">Settings</p>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="source_tts_provider">TTS Provider:</Label>
                    <Select value={config.source_tts_provider} onValueChange={(value) => handleInputChange('source_tts_provider', value)}>
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
                    <Label htmlFor="source_voice">Voice (optional):</Label>
                    <Input
                      id="source_voice"
                      type="text"
                      placeholder="Enter voice ID (leave empty for default)"
                      value={config.source_voice}
                      onChange={(e) => handleInputChange('source_voice', e.target.value)}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Participant 2 (Target) */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Participant 2 (Target)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="to_number">Phone Number:</Label>
                <Input
                  id="to_number"
                  type="tel"
                  placeholder="+1234567890"
                  value={config.to_number}
                  onChange={(e) => handleInputChange('to_number', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Must be in E.164 format (e.g., +442071838750)</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target_language">Language:</Label>
                <Select value={config.target_language} onValueChange={(value) => handleInputChange('target_language', value)}>
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

              <Collapsible>
                <CollapsibleTrigger className="w-full text-left">
                  <p className="cursor-pointer font-semibold text-purple-600 hover:text-purple-700">Settings</p>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="target_tts_provider">TTS Provider:</Label>
                    <Select value={config.target_tts_provider} onValueChange={(value) => handleInputChange('target_tts_provider', value)}>
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
                    <Label htmlFor="target_voice">Voice (optional):</Label>
                    <Input
                      id="target_voice"
                      type="text"
                      placeholder="Enter voice ID (leave empty for default)"
                      value={config.target_voice}
                      onChange={(e) => handleInputChange('target_voice', e.target.value)}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-lg font-semibold"
        >
          {loading ? "Initiating..." : "Initiate Translation Call"}
        </Button>
      </form>

      {/* Recent Calls */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-left text-base">Recent Calls</CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                Logs will be temporary, session-only
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default PhoneCallForm;