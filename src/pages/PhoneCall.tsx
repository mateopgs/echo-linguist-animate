
import React from "react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Settings, ArrowLeft } from "lucide-react";
import PhoneCallForm from "../components/PhoneCallForm";
import { Link } from "react-router-dom";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../components/ui/dialog";
import ConfigForm from "../components/ConfigForm";

const PhoneCall: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Card className="h-full border-0 rounded-none">
        <CardHeader className="bg-gradient-to-r from-background to-primary/10 px-4 py-3 border-b">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Llamadas Telefónicas</h1>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings size={16} />
                  Configuración
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-sm md:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Configuración</DialogTitle>
                </DialogHeader>
                <ConfigForm />
                <DialogClose asChild>
                  <Button className="mt-4 w-full">Cerrar</Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center min-h-[calc(100vh-120px)]">
          <PhoneCallForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default PhoneCall;
