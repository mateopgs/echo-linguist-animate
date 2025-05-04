
import React, { useEffect, useState } from "react";
import { AssistantState } from "../types/voice-assistant";

type AudioVisualizerProps = {
  state: AssistantState;
};

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ state }) => {
  const [barCount, setBarCount] = useState(10);
  
  // Adjust bar count based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 400) {
        setBarCount(5);
      } else if (width < 768) {
        setBarCount(10);
      } else {
        setBarCount(15);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = state === AssistantState.LISTENING || state === AssistantState.SPEAKING;

  return (
    <div className="py-4 flex justify-center">
      <div 
        className={`flex items-end justify-center h-20 space-x-1 w-full max-w-md ${
          state === AssistantState.ERROR ? "opacity-50" : ""
        }`}
      >
        {Array.from({ length: barCount }).map((_, index) => (
          <div 
            key={index} 
            className={`w-2 md:w-3 rounded-md transition-all duration-50 ${
              state === AssistantState.LISTENING 
                ? "bg-red-500" 
                : state === AssistantState.SPEAKING 
                  ? "bg-green-500" 
                  : "bg-gray-300"
            }`}
            style={{ 
              height: isActive 
                ? `${Math.max(15, Math.random() * 100)}%` 
                : "15%",
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
              animationDelay: `${index * 0.05}s`,
              animation: isActive ? 'pulse 0.5s infinite alternate' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AudioVisualizer;
