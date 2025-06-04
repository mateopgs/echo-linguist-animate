import React from 'react';
import './App.css';
import VoiceAssistant from './components/VoiceAssistant';
import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';
import { Toaster } from './components/ui/toaster';

const App: React.FC = () => {
  return (
    <VoiceAssistantProvider>
      <div className="min-h-screen flex items-center justify-center w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <div className="w-full max-w-[90vw]">
          <VoiceAssistant />
        </div>
      </div>
      <Toaster />
    </VoiceAssistantProvider>
  );
};

export default App;
