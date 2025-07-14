
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Mic, Speaker, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

interface AudioDeviceSelectorProps {
  selectedInputDevice: string;
  selectedOutputDevice: string;
  onInputDeviceChange: (deviceId: string) => void;
  onOutputDeviceChange: (deviceId: string) => void;
}

const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({
  selectedInputDevice,
  selectedOutputDevice,
  onInputDeviceChange,
  onOutputDeviceChange,
}) => {
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadAudioDevices = async () => {
    setIsLoading(true);
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs: AudioDevice[] = devices
        .filter(device => device.kind === 'audioinput' && device.deviceId !== 'default')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Micrófono ${device.deviceId.slice(0, 8)}`,
          kind: 'audioinput'
        }));

      const audioOutputs: AudioDevice[] = devices
        .filter(device => device.kind === 'audiooutput' && device.deviceId !== 'default')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Altavoz ${device.deviceId.slice(0, 8)}`,
          kind: 'audiooutput'
        }));

      setInputDevices(audioInputs);
      setOutputDevices(audioOutputs);
      
      console.log('Audio devices loaded:', { audioInputs, audioOutputs });
    } catch (error) {
      console.error('Error loading audio devices:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los dispositivos de audio. Asegúrate de dar permisos de micrófono.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudioDevices();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Dispositivos de Audio</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAudioDevices}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="space-y-3">
        {/* Selector de micrófono */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <Mic className="h-4 w-4 mr-2" />
            Micrófono
          </label>
          <Select value={selectedInputDevice} onValueChange={onInputDeviceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar micrófono" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Micrófono por defecto</SelectItem>
              {inputDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selector de dispositivo de salida */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <Speaker className="h-4 w-4 mr-2" />
            Dispositivo de Salida
          </label>
          <Select value={selectedOutputDevice} onValueChange={onOutputDeviceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar dispositivo de salida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Altavoz por defecto</SelectItem>
              {outputDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {inputDevices.length === 0 && outputDevices.length === 0 && !isLoading && (
        <div className="text-sm text-muted-foreground text-center py-4">
          <p>No se encontraron dispositivos de audio.</p>
          <p>Asegúrate de dar permisos de micrófono y actualizar la lista.</p>
        </div>
      )}
    </div>
  );
};

export default AudioDeviceSelector;
