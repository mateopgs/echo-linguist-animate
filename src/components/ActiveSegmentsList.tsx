
import React from "react";
import { AudioSegment, SegmentStatus } from "../services/realTimeTranslationService";

type ActiveSegmentsListProps = {
  segments: AudioSegment[];
  sourceLanguageName: string;
  targetLanguageName: string;
};

const getStatusLabel = (status: SegmentStatus): string => {
  switch (status) {
    case SegmentStatus.RECORDING:
      return "Grabando...";
    case SegmentStatus.RECOGNIZING:
      return "Reconociendo...";
    case SegmentStatus.TRANSLATING:
      return "Traduciendo...";
    case SegmentStatus.SYNTHESIZING:
      return "Sintetizando...";
    case SegmentStatus.PLAYING:
      return "Reproduciendo...";
    case SegmentStatus.COMPLETED:
      return "Completado";
    case SegmentStatus.ERROR:
      return "Error";
    default:
      return "Procesando...";
  }
};

const getStatusColor = (status: SegmentStatus): string => {
  switch (status) {
    case SegmentStatus.RECORDING:
      return "text-red-500";
    case SegmentStatus.RECOGNIZING:
      return "text-amber-500";
    case SegmentStatus.TRANSLATING:
      return "text-blue-500";
    case SegmentStatus.SYNTHESIZING:
      return "text-indigo-500";
    case SegmentStatus.PLAYING:
      return "text-green-500";
    case SegmentStatus.COMPLETED:
      return "text-gray-500";
    case SegmentStatus.ERROR:
      return "text-red-700";
    default:
      return "text-gray-700";
  }
};

const ActiveSegmentsList: React.FC<ActiveSegmentsListProps> = ({
  segments,
  sourceLanguageName,
  targetLanguageName,
}) => {
  // Only show active segments (not completed or errored)
  const activeSegments = segments.filter(
    (segment) => segment.status !== SegmentStatus.COMPLETED
  );

  if (activeSegments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-sm font-medium text-gray-500">Segmentos activos</h3>
      <div className="space-y-3">
        {activeSegments.map((segment) => (
          <div
            key={segment.id}
            className="bg-white/40 backdrop-blur-sm border rounded-lg p-3 text-sm animate-fade-in"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">
                Segmento #{segment.id + 1}
              </span>
              <span
                className={`text-xs font-medium ${getStatusColor(
                  segment.status
                )}`}
              >
                {getStatusLabel(segment.status)}
              </span>
            </div>

            {segment.originalText && (
              <div className="mb-2">
                <div className="text-xs text-gray-500">{sourceLanguageName}</div>
                <p className="text-sm">{segment.originalText}</p>
              </div>
            )}

            {segment.translatedText && (
              <div>
                <div className="text-xs text-gray-500">
                  {targetLanguageName}
                </div>
                <p className="text-sm font-medium">{segment.translatedText}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveSegmentsList;
