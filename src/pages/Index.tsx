
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Phone, MessageSquare } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-voiceAssistant-background flex items-center justify-center px-2 sm:px-4 py-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/72da0a50-4942-409a-b30c-5d599427fa00.png" 
            alt="Translate AI Logo" 
            className="h-16 sm:h-20 md:h-24 mx-auto mb-4"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-voiceAssistant-text mb-2">
            Choose your translation mode
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto justify-items-center">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 w-full max-w-sm">
              <CardHeader>
              <CardTitle className="flex items-center justify-center gap-3 text-voiceAssistant-text">
                <MessageSquare className="h-6 w-6 text-voiceAssistant-primary" />
                Interpreter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col items-center text-center">
              <p className="text-voiceAssistant-text/80">
                Real-time voice translation for in-person conversations
              </p>
              <Link to="/interprete">
                <Button 
                  className="w-full bg-voiceAssistant-primary hover:bg-voiceAssistant-primary/90 text-white"
                  size="lg"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Use Interpreter
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 w-full max-w-sm">
          <CardHeader>
          <CardTitle className="flex items-center justify-center gap-3 text-voiceAssistant-text">
                <Phone className="h-6 w-6 text-voiceAssistant-primary" />
                Phone Call
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4 flex flex-col items-center text-center">
              <p className="text-voiceAssistant-text/80">
                Make calls with real-time automatic translation
              </p>
              <Link to="/phonecall">
                <Button 
                  className="w-full bg-voiceAssistant-primary hover:bg-voiceAssistant-primary/90 text-white"
                  size="lg"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Make Call
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
