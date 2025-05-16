import React from "react";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

const ConfigForm: React.FC = () => {
  const {
    apiKey,
    region,
    setApiKey,
    setRegion,
    isRealTimeMode,
    setRealTimeMode,
    isCapturingWhileSpeaking,
    setCapturingWhileSpeaking,
    segmentInterval,
    setSegmentInterval,
    initialSilenceTimeout,
    setInitialSilenceTimeout,
    endSilenceTimeout,
    setEndSilenceTimeout,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    voiceSpeed,
    setVoiceSpeed,
    useAIEnhancement,
    setUseAIEnhancement
  } = useVoiceAssistant();

  return (
    // Scroll container with max height
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="useAIEnhancement" className="text-base">
            Mejora con IA
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={16} className="text-slate-400" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                Activa esta opción para utilizar IA para mejorar la calidad de las traducciones y mantener el contexto de la conversación.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Mejora de traducciones con OpenAI
          </span>
          <Switch
            id="useAIEnhancement"
            checked={useAIEnhancement}
            onCheckedChange={setUseAIEnhancement}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="realTimeMode" className="text-base">
            Modo de traducción
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={16} className="text-slate-400" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                El modo en tiempo real proporciona traducción continua mientras hablas. El modo normal espera a que termines de hablar antes de traducir.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Traducción en tiempo real
          </span>
          <Switch
            id="realTimeMode"
            checked={isRealTimeMode}
            onCheckedChange={setRealTimeMode}
          />
        </div>
      </div>

      {isRealTimeMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="capturingWhileSpeaking" className="text-base">
              Capturar mientras habla
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} className="text-slate-400" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  Permite seguir capturando audio mientras se reproduce la traducción, para una conversación más fluida.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Continuar escuchando durante la reproducción
            </span>
            <Switch
              id="capturingWhileSpeaking"
              checked={isCapturingWhileSpeaking}
              onCheckedChange={setCapturingWhileSpeaking}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="voiceSpeed" className="text-base">
            Velocidad de voz
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={16} className="text-slate-400" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                Ajusta la velocidad de reproducción de la voz sintetizada.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="space-y-1">
          <Slider
            id="voiceSpeed"
            defaultValue={[voiceSpeed]}
            max={2}
            min={0.5}
            step={0.1}
            onValueChange={(values) => setVoiceSpeed(values[0])}
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0.5x</span>
            <span>{voiceSpeed.toFixed(1)}x</span>
            <span>2.0x</span>
          </div>
        </div>
      </div>

      {isRealTimeMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="segmentInterval" className="text-base">
              Intervalo de segmentos
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} className="text-slate-400" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  Define cada cuántos milisegundos se procesa un segmento de audio para traducción.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="space-y-1">
            <Slider
              id="segmentInterval"
              defaultValue={[segmentInterval]}
              max={500}
              min={50}
              step={50}
              onValueChange={(values) => setSegmentInterval(values[0])}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>50ms</span>
              <span>{segmentInterval}ms</span>
              <span>500ms</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="voiceSelector" className="text-base">
            Voz
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={16} className="text-slate-400" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                Selecciona la voz que se utilizará para la síntesis de voz.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select
          value={selectedVoice?.id || ""}
          onValueChange={(id) => {
            const voice = availableVoices.find((v) => v.id === id);
            if (voice) setSelectedVoice(voice);
          }}
        >
          <SelectTrigger id="voiceSelector">
            <SelectValue placeholder="Seleccionar voz" />
          </SelectTrigger>
          <SelectContent>
            {availableVoices.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                {voice.name} ({voice.locale})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Advanced settings collapsible */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced">
          <AccordionTrigger className="w-full text-left font-medium">Configuración avanzada</AccordionTrigger>
          <AccordionContent>
            {isRealTimeMode && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="initialSilenceTimeout" className="text-sm">
                      Tiempo de inicio del silencio
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info size={16} className="text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          Tiempo en milisegundos antes de que el sistema determine que ha comenzado el silencio inicial.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="space-y-1">
                    <Slider
                      id="initialSilenceTimeout"
                      defaultValue={[initialSilenceTimeout]}
                      max={10000}
                      min={1000}
                      step={1000}
                      onValueChange={(values) => setInitialSilenceTimeout(values[0])}
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>1s</span>
                      <span>{(initialSilenceTimeout / 1000).toFixed(0)}s</span>
                      <span>10s</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="endSilenceTimeout" className="text-sm">
                      Tiempo de fin del silencio
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info size={16} className="text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          Tiempo en milisegundos de silencio para determinar que se ha terminado de hablar.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="space-y-1">
                    <Slider
                      id="endSilenceTimeout"
                      defaultValue={[endSilenceTimeout]}
                      max={2000}
                      min={100}
                      step={100}
                      onValueChange={(values) => setEndSilenceTimeout(values[0])}
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>100ms</span>
                      <span>{endSilenceTimeout}ms</span>
                      <span>2000ms</span>
                    </div>
                  </div>
                </div>
<<<<<<< HEAD
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
=======
              </div>
            </div>
          </>
        )}
      </div>
>>>>>>> 6b34e47 (:construction:)
    </div>
  );
};

export default ConfigForm;
