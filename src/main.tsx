
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Toaster } from "./components/ui/toaster";
import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';

createRoot(document.getElementById("root")!).render(
  <VoiceAssistantProvider>
    <App />
    <Toaster />
  </VoiceAssistantProvider>
);
