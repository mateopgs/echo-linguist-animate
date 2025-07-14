
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Phone, PhoneCall } from "lucide-react";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { PhoneCallConfig, COUNTRY_CODES } from "../types/phone-call";
import { useToast } from "../hooks/use-toast";

const PhoneCallForm: React.FC = () => {
  const { supportedLanguages } = useVoiceAssistant();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<PhoneCallConfig>({
    sourceLanguage: "es-ES",
    targetLanguage: "en-US",
    countryCode: "+57",
    phoneNumber: ""
  });

  const getLanguageName = (code: string) => {
    const language = supportedLanguages.find((lang) => lang.code === code);
    return language ? 
      (language.nativeName ? `${language.name} (${language.nativeName})` : language.name) : 
      code;
  };

  const handleInputChange = (field: keyof PhoneCallConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartCall = () => {
    if (!config.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive"
      });
      return;
    }

    // Aquí se implementaría la lógica de llamada
    toast({
      title: "Call initiated",
      description: `Starting translated call to ${config.countryCode} ${config.phoneNumber}`,
    });
    
    console.log("Starting phone call with config:", config);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-voiceAssistant-text">
          <PhoneCall className="h-6 w-6" />
          Phone Call Translation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourceLanguage" className="text-sm font-medium text-voiceAssistant-text">
              Speak in
            </Label>
            <Select value={config.sourceLanguage} onValueChange={(value) => handleInputChange("sourceLanguage", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source language" />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {getLanguageName(language.code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetLanguage" className="text-sm font-medium text-voiceAssistant-text">
              Translate to
            </Label>
            <Select value={config.targetLanguage} onValueChange={(value) => handleInputChange("targetLanguage", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select target language" />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {getLanguageName(language.code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-sm font-medium text-voiceAssistant-text">
              Phone Number
            </Label>
            <div className="flex gap-2">
              <Select value={config.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Code" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((country, index) => (
                    <SelectItem key={`${country.code}-${index}`} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                placeholder="Phone number"
                value={config.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the phone number without the country code
            </p>
          </div>
        </div>

        <Button 
          onClick={handleStartCall}
          className="w-full bg-voiceAssistant-primary hover:bg-voiceAssistant-primary/90 text-white"
          size="lg"
        >
          <Phone className="mr-2 h-4 w-4" />
          Start Translated Call
        </Button>
      </CardContent>
    </Card>
  );
};

export default PhoneCallForm;
