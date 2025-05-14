
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { SupportedLanguages } from "../types/voice-assistant";

type LanguageSelectorProps = {
  languages: SupportedLanguages[];
  selectedLanguage: string;
  onChange: (value: string) => void;
  label: string;
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selectedLanguage,
  onChange,
  label,
}) => {
  // Función para obtener el nombre de visualización del idioma
  const getDisplayName = (language: SupportedLanguages) => {
    return language.nativeName ? 
      `${language.name} (${language.nativeName})` : 
      language.name;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-voiceAssistant-text">{label}</label>
      <Select value={selectedLanguage} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              {getDisplayName(language)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
