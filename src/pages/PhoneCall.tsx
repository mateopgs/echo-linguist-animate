
import React from "react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import PhoneCallForm from "../components/PhoneCallForm";
import { Link } from "react-router-dom";

const PhoneCall: React.FC = () => {
  return (
    <Card className="w-screen h-screen shadow-lg">
      <CardHeader
        style={{ background: 'linear-gradient(to right, white 0%, white 15%, #7c3aed 100%)' }}
        className="text-white rounded-t-lg px-3 py-2 sm:px-4 sm:py-3 shadow-sm"
      >
        <div className="relative flex items-center w-full">
          <div className="flex items-center">
            <Link to="/">
              <Button variant="ghost" className="text-white h-8 w-8 p-0 sm:h-9 sm:w-9 sm:p-1 mr-2">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <img 
              src="/lovable-uploads/72da0a50-4942-409a-b30c-5d599427fa00.png" 
              alt="Traduce AI Logo" 
              className="h-6 sm:h-8 md:h-10"
            />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="font-semibold text-white text-sm sm:text-base">Translation Call</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 md:space-y-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <PhoneCallForm />
      </CardContent>
    </Card>
  );
};

export default PhoneCall;
