
import React, { useEffect, useState } from "react";
import { AssistantState } from "../types/voice-assistant";

type AudioVisualizerProps = {
  state: AssistantState;
};

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ state }) => {
  const [barCount, setBarCount] = useState(5);
  
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

  return (
    <div 
      className={`audio-visualizer ${
        state === AssistantState.LISTENING ? "listening" : 
        state === AssistantState.SPEAKING ? "speaking" : ""
      }`}
    >
      {Array.from({ length: barCount }).map((_, index) => (
        <div 
          key={index} 
          className="bar"
          style={{ 
            animationDelay: `${(index % 5) * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
