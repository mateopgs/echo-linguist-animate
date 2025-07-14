
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Phone, Languages, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Bienvenido a Traduce AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tu asistente inteligente para traducción en tiempo real y comunicación internacional
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Phone className="h-6 w-6 text-primary" />
                Llamadas Telefónicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Realiza llamadas con traducción automática en tiempo real. 
                Perfecto para comunicación internacional sin barreras de idioma.
              </p>
              <Link to="/phonecall">
                <Button className="w-full gap-2">
                  Iniciar Llamada
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Languages className="h-6 w-6 text-primary" />
                Intérprete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Activa el modo intérprete para conversaciones cara a cara 
                con traducción bidireccional instantánea.
              </p>
              <Link to="/interpreter">
                <Button variant="outline" className="w-full gap-2">
                  Abrir Intérprete
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Características Principales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Llamadas Inteligentes</h3>
                <p className="text-sm text-muted-foreground">
                  Traducción en tiempo real durante llamadas telefónicas
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Languages className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Múltiples Idiomas</h3>
                <p className="text-sm text-muted-foreground">
                  Soporte para más de 50 idiomas diferentes
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Fácil de Usar</h3>
                <p className="text-sm text-muted-foreground">
                  Interfaz intuitiva y configuración simple
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
