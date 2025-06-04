
import React from 'react';
import './App.css';
import VoiceAssistant from './components/VoiceAssistant';
import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';
import { Toaster } from './components/ui/toaster';

const App: React.FC = () => {
  return (
    <VoiceAssistantProvider>
      <div className="min-h-screen flex items-center justify-center p-4">
        <VoiceAssistant />
      </div>
      <Toaster />
    </VoiceAssistantProvider>
  );
};

export default App;
