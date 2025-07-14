
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Index from './pages/Index';
import PhoneCall from './pages/PhoneCall';
import NotFound from './pages/NotFound';
import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';

const App: React.FC = () => {
  return (
    <VoiceAssistantProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/phonecall" element={<PhoneCall />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </VoiceAssistantProvider>
  );
};

export default App;
