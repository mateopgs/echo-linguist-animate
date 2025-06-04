import React from 'react';
import './App.css';
import VoiceAssistant from './components/VoiceAssistant';
import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';
import { Toaster } from './components/ui/toaster';

const App: React.FC = () => {
  return (
    <VoiceAssistantProvider>
      <VoiceAssistant />
      <Toaster />
    </VoiceAssistantProvider>
  );
};

export default App;
