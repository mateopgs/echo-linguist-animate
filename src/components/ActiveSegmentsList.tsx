
import React, { useMemo } from "react";
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
  // Usamos useMemo para no volver a calcular esto en cada renderizado
  const { recordingSegment, otherSegmentsToShow } = useMemo(() => {
    // Filter out completed segments
    const activeSegments = segments.filter(s => 
      s.status !== SegmentStatus.COMPLETED && 
      // Filtrar segmentos duplicados basándonos en el contenido
      s.originalText && s.translatedText
    );

    // Ordenar para que los segmentos parciales aparezcan primero
    const sortedSegments = [...activeSegments].sort((a, b) => {
      // Priorizar segmentos que se están grabando
      if (a.status === SegmentStatus.RECORDING && b.status !== SegmentStatus.RECORDING) return -1;
      if (b.status === SegmentStatus.RECORDING && a.status !== SegmentStatus.RECORDING) return 1;
      
      // Luego priorizar segmentos parciales
      if (a.isPartial && !b.isPartial) return -1;
      if (!a.isPartial && b.isPartial) return 1;
      
      // Finalmente ordenar por timestamp descendente (más recientes primero)
      return b.timestamp - a.timestamp;
    });

    // Encuentra el segmento actualmente en grabación o el primer segmento parcial
    const recordingSegment = sortedSegments.find(s => 
      s.status === SegmentStatus.RECORDING || s.isPartial
    );
    
    // Otros segmentos, excluyendo el que ya mostramos arriba
    const otherSegments = recordingSegment 
      ? sortedSegments.filter(s => s.id !== recordingSegment.id)
      : sortedSegments;
      
    // Mantener solo los últimos 3 para la segunda fila
    const otherSegmentsToShow = otherSegments.slice(0, 3);
    
    return { recordingSegment, otherSegmentsToShow };
  }, [segments]);

  // Si no hay segmentos activos, no mostrar nada
  if (!recordingSegment && otherSegmentsToShow.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-sm font-medium text-gray-500 text-center md:text-left">Interpretación en curso</h3>
      <div className="space-y-3">
        {/* Primera fila: segmento actual en grabación o parcial */}
        {recordingSegment && (
          <div
            key={recordingSegment.id}
            className={`bg-white/40 backdrop-blur-sm border rounded-lg p-3 text-sm animate-fade-in ${
              recordingSegment.isPartial ? "border-blue-300" : ""
            }`}
          >
            <div className="flex items-center mb-1">
              <span className="text-xs font-medium">
                {recordingSegment.isPartial 
                  ? "Reconocimiento parcial" 
                  : `Interpretación #${Math.abs(recordingSegment.id) + 1}`}
              </span>
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
        )}
        
        {/* Segunda fila: hasta 3 otros segmentos en una columna vertical */}
        {otherSegmentsToShow.length > 0 && (
          <div className="flex flex-col space-y-3">
            {otherSegmentsToShow.map(segment => (
              <div
                key={segment.id}
                className={`bg-white/40 backdrop-blur-sm border rounded-lg p-3 text-sm animate-fade-in ${
                  segment.isPartial ? "border-blue-300" : ""
                }`}
              >
                <div className="flex items-center mb-1">
                  <span className="text-xs font-medium">
                    {segment.isPartial 
                      ? "Reconocimiento parcial" 
                      : `Interpretación #${Math.abs(segment.id) + 1}`}
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
                    <div className="text-xs text-gray-500">{targetLanguageName}</div>
                    <p className="text-sm font-medium">{segment.translatedText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSegmentsList;
