
import React from "react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Settings, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../components/ui/dialog";
import ConfigForm from "../components/ConfigForm";
import VoiceAssistant from "../components/VoiceAssistant";

const Interpreter: React.FC = () => {
  return (
    <Card className="w-screen h-screen shadow-lg">
      <CardHeader
        style={{ background: 'linear-gradient(to right, white 0%, white 15%, #7c3aed 100%)' }}
        className="text-white rounded-t-lg px-3 py-2 sm:px-4 sm:py-3 shadow-sm"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <Link to="/">
              <Button variant="ghost" className="text-white h-8 w-8 p-0 sm:h-9 sm:w-9 sm:p-1 mr-2">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <img 
              src="/lovable-uploads/72da0a50-4942-409a-b30c-5d599427fa00.png" 
              alt="Traduce AI Logo" 
              className="h-6 sm:h-8 md:h-10 mr-2"
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-white h-8 w-8 p-0 sm:h-9 sm:w-9 sm:p-1">
                <Settings size={20} className="sm:size-24" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-sm md:max-w-lg">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <ConfigForm />
              <DialogClose asChild>
                <Button className="mt-4 w-full">Close</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 md:space-y-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <VoiceAssistant />
      </CardContent>
    </Card>
  );
};

export default Interpreter;
