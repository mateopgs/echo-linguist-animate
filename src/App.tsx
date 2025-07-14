
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Index from './pages/Index';
import PhoneCall from './pages/PhoneCall';
import Interpreter from './pages/Interpreter';
import NotFound from './pages/NotFound';
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';

const App: React.FC = () => {
  return (
    <Router>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1">
            <header className="h-12 flex items-center border-b px-4">
              <SidebarTrigger />
            </header>
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/phonecall" element={<PhoneCall />} />
                <Route path="/interpreter" element={<Interpreter />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </Router>
  );
};

export default App;
