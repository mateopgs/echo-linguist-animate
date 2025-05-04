
import React, { useEffect, useState } from "react";
import { AssistantState } from "../types/voice-assistant";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";

type AudioVisualizerProps = {
  state: AssistantState;
};

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ state }) => {
  const [barCount, setBarCount] = useState(10);
  const { isRealTimeMode, isCapturingWhileSpeaking } = useVoiceAssistant();
  
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
  const isRealTimeActive = isRealTimeMode && state === AssistantState.LISTENING;
  const isSimultaneousMode = isCapturingWhileSpeaking && isRealTimeMode;

  return (
    <div className="py-4 flex justify-center">
      <div 
        className={`flex items-end justify-center h-20 space-x-1 w-full max-w-md ${
          state === AssistantState.ERROR ? "opacity-50" : ""
        }`}
      >
        {Array.from({ length: barCount }).map((_, index) => {
          // Determine the bar color based on the current state
          let barColor = "bg-gray-300";
          
          if (isSimultaneousMode) {
            // Show gradient when capturing and speaking simultaneously
            barColor = "bg-gradient-to-t from-red-500 to-green-500";
          } else if (isRealTimeActive) {
            barColor = "bg-gradient-to-t from-red-500 to-blue-500";
          } else if (state === AssistantState.LISTENING) {
            barColor = "bg-red-500";
          } else if (state === AssistantState.SPEAKING) {
            barColor = "bg-green-500";
          }
          
          return (
            <div 
              key={index} 
              className={`w-2 md:w-3 rounded-md transition-all duration-50 ${barColor}`}
              style={{ 
                height: isActive 
                  ? `${Math.max(15, Math.random() * 100)}%` 
                  : "15%",
                animationDuration: isRealTimeActive || isSimultaneousMode
                  ? `${0.3 + Math.random() * 0.3}s`
                  : `${0.5 + Math.random() * 0.5}s`,
                animationDelay: `${index * 0.05}s`,
                animation: isActive ? 'pulse 0.5s infinite alternate' : 'none',
                transition: isRealTimeActive || isSimultaneousMode 
                  ? 'height 150ms ease' 
                  : 'height 300ms ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AudioVisualizer;
