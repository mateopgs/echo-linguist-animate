
import React from 'react';
import './App.css';
import VoiceAssistant from './components/VoiceAssistant';
import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';
import { Toaster } from './components/ui/toaster';

const App: React.FC = () => {
  return (
    <VoiceAssistantProvider>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-voiceAssistant-background flex items-center justify-center px-2 sm:px-4 py-4">
        <div className="w-full max-w-4xl">
          <VoiceAssistant />
        </div>
      </div>
      <Toaster />
    </VoiceAssistantProvider>
  );
};

export default App;
