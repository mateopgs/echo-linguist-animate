
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Languages, Mic, Volume2, Settings } from "lucide-react";
import { Button } from "../components/ui/button";

const Interpreter: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-6 w-6 text-primary" />
              Intérprete en Tiempo Real
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Activa el intérprete para traducir conversaciones en tiempo real
              </p>
              <Button size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Iniciar Interpretación
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Idioma de Entrada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select className="w-full p-2 border rounded-md">
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                    <option value="fr">Francés</option>
                    <option value="de">Alemán</option>
                  </select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Idioma de Salida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select className="w-full p-2 border rounded-md">
                    <option value="en">Inglés</option>
                    <option value="es">Español</option>
                    <option value="fr">Francés</option>
                    <option value="de">Alemán</option>
                  </select>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración del Intérprete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Traducción automática</label>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Guardar conversaciones</label>
                  <input type="checkbox" className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Modo manos libres</label>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Interpreter;
