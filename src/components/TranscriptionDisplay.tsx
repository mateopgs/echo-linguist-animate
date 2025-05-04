
import React from "react";

type TranscriptionDisplayProps = {
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
};

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  originalText,
  translatedText,
  originalLanguage,
  targetLanguage,
}) => {
  return (
    <div className="flex flex-col space-y-3 w-full">
      <div className="border rounded-lg p-4 bg-white shadow-sm animate-fade-in">
        <div className="text-xs mb-1 text-muted-foreground">
          {originalLanguage}
        </div>
        <p className="text-lg">{originalText || "Waiting for speech..."}</p>
      </div>
      
      <div className="border rounded-lg p-4 bg-voiceAssistant-background shadow-sm animate-fade-in">
        <div className="text-xs mb-1 text-muted-foreground">
          {targetLanguage}
        </div>
        <p className="text-lg font-medium text-voiceAssistant-primary">
          {translatedText || "Translation will appear here..."}
        </p>
      </div>
    </div>
  );
};

export default TranscriptionDisplay;
