
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
        setBarCount(8);
      } else if (width < 1024) {
        setBarCount(12);
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
    <div className="py-2 md:py-4 flex justify-center">
      <div 
        className={`flex items-end justify-center h-16 md:h-20 space-x-0.5 sm:space-x-1 w-full max-w-md transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-30'} ${state === AssistantState.ERROR ? 'opacity-50' : ''}`}
      >
        {Array.from({ length: barCount }).map((_, index) => {
          // Determine the bar color based on the current state
          let barColor = "bg-gray-300";
          
          if (isSimultaneousMode) {
            barColor = "bg-gradient-to-t from-purple-600 to-gray-300";
          } else if (isRealTimeActive) {
            barColor = "bg-gradient-to-t from-purple-500 to-gray-400";
          } else if (state === AssistantState.LISTENING) {
            barColor = "bg-purple-500";
          } else if (state === AssistantState.SPEAKING) {
            barColor = "bg-gray-500";
          }
          
          return (
            <div 
              key={index} 
              className={`w-1.5 sm:w-2 md:w-3 rounded-full ${barColor} animate-pulse-slow`}
              style={{ 
                height: isActive 
                  ? `${20 + Math.random() * 60}%` 
                  : '15%'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AudioVisualizer;
