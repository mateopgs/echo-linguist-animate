import React from "react";
import { AudioSegment, SegmentStatus } from "../services/realTimeTranslationService";

type ActiveSegmentsListProps = {
  segments: AudioSegment[];
  sourceLanguageName: string;
  targetLanguageName: string;
};

const ActiveSegmentsList: React.FC<ActiveSegmentsListProps> = ({
  segments,
  sourceLanguageName,
  targetLanguageName,
}) => {
  // Filter out completed segments
  const activeSegments = segments.filter(s => s.status !== SegmentStatus.COMPLETED);

  // Prioritize currently recording segment and list of other active ones
  const recordingSegment = activeSegments.find(s => s.status === SegmentStatus.RECORDING);
  const otherSegments = activeSegments.filter(s => s.status !== SegmentStatus.RECORDING);
  // Keep only last 3 of other segments for second row
  const otherSegmentsToShow = otherSegments.slice(-3);

  // If no recording and no other segments → nothing to show
  if (!recordingSegment && otherSegmentsToShow.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-sm font-medium text-gray-500 text-center md:text-left">Active Segments</h3>
      <div className="space-y-3">
        {/* First row: current recording segment full width */}
        {recordingSegment && (() => {
            return (
            <div
              key={recordingSegment.id}
              className="bg-white/40 backdrop-blur-sm border rounded-lg p-3 text-sm animate-fade-in"
            >
              <div className="flex items-center mb-1">
                <span className="text-xs font-medium">Interpretation #{recordingSegment.id + 1}</span>
              </div>
              {recordingSegment.originalText && (
                <div className="mb-2">
                  <div className="text-xs text-gray-500">{sourceLanguageName}</div>
                  <p className="text-sm">{recordingSegment.originalText}</p>
                </div>
              )}
              {recordingSegment.translatedText && (
                <div>
                  <div className="text-xs text-gray-500">{targetLanguageName}</div>
                  <p className="text-sm font-medium">{recordingSegment.translatedText}</p>
                </div>
              )}
            </div>
          );
        })()}
        {/* Second row: up to 3 other segments in a vertical column */}
        {otherSegmentsToShow.length > 0 && (
          <div className="flex flex-col space-y-3">
            {otherSegmentsToShow.map(segment => {
              // no timestamp display
              return (
                <div
                  key={segment.id}
                  className="bg-white/40 backdrop-blur-sm border rounded-lg p-3 text-sm animate-fade-in"
                >
                  <div className="flex items-center mb-1">
                    <span className="text-xs font-medium">Interpretation #{segment.id + 1}</span>
                  </div>
                  {segment.originalText && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-500">{sourceLanguageName}</div>
                      <p className="text-sm">{segment.originalText}</p>
                    </div>
                  )}
                  {segment.translatedText && (
                    <div>
                      <div className="text-xs text-gray-500">{targetLanguageName}</div>
                      <p className="text-sm font-medium">{segment.translatedText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSegmentsList;
