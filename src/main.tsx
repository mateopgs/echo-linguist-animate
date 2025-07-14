
import { createRoot } from 'react-dom/client'
import Index from './pages/Index.tsx'
import './index.css'
import { Toaster } from "./components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <>
    <Index />
    <Toaster />
  </>
);
