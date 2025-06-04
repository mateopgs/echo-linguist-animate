
import { 
  SpeechConfig, 
  AudioConfig, 
  SpeechRecognizer, 
  ResultReason,
  SpeechRecognitionEventArgs,
  SpeechRecognitionResult
} from 'microsoft-cognitiveservices-speech-sdk';

export enum SegmentStatus {
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface AudioSegment {
  id: number;
  originalText: string;
  translatedText: string;
  timestamp: number;
  status: SegmentStatus;
  isPartial: boolean;
  duration?: number;
  silenceDetected?: boolean;
}

export class RealTimeTranslationService {
  private speechConfig: SpeechConfig | null = null;
  private audioConfig: AudioConfig | null = null;
  private recognizer: SpeechRecognizer | null = null;
  private isListening: boolean = false;
  private segmentCounter: number = 0;
  private currentSegment: AudioSegment | null = null;
  private onSegmentUpdate: ((segment: AudioSegment) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private sourceLanguage: string = 'es-ES';
  private targetLanguage: string = 'en-US';
  private useAIEnhancement: boolean = false;
  private segmentHistory: Map<number, AudioSegment> = new Map();
  
  // Configuración mejorada para detección de silencios
  private silenceTimeout: number = 200; // Reducido a 200ms como solicitado
  private initialSilenceTimeout: number = 3000; // Reducido para mejor respuesta
  private minSegmentLength: number = 3; // Mínimo 3 caracteres para crear segmento
  private lastSpeechTime: number = 0;
  private segmentStartTime: number = 0;

  constructor(
    apiKey: string, 
    region: string,
    sourceLanguage: string = 'es-ES',
    targetLanguage: string = 'en-US'
  ) {
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.initializeSpeechConfig(apiKey, region);
  }

  private initializeSpeechConfig(apiKey: string, region: string): void {
    try {
      this.speechConfig = SpeechConfig.fromSubscription(apiKey, region);
      this.speechConfig.speechRecognitionLanguage = this.sourceLanguage;
      this.speechConfig.enableDictation();
      
      // Configuración optimizada para mejor detección de silencios
      this.speechConfig.setProperty("SpeechServiceConnection_InitialSilenceTimeoutMs", this.initialSilenceTimeout.toString());
      this.speechConfig.setProperty("SpeechServiceConnection_EndSilenceTimeoutMs", this.silenceTimeout.toString());
      this.speechConfig.setProperty("SpeechServiceConnection_EnableAudioLogging", "true");
      
      // Configuraciones adicionales para mejor precisión
      this.speechConfig.setProperty("SpeechServiceConnection_RecognitionMode", "Conversation");
      this.speechConfig.setProperty("SpeechServiceResponse_Synthesis_WordBoundaryEnabled", "true");
      
      this.audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      
      console.log('Speech config optimizado para mejor detección de silencios');
    } catch (error) {
      console.error('Error initializing speech config:', error);
      this.onError?.(`Error initializing speech recognition: ${error}`);
    }
  }

  public setSilenceTimeout(timeoutMs: number): void {
    this.silenceTimeout = Math.max(100, Math.min(1000, timeoutMs)); // Entre 100ms y 1s
    console.log(`Silence timeout configurado a: ${this.silenceTimeout}ms`);
    
    if (this.speechConfig) {
      this.speechConfig.setProperty("SpeechServiceConnection_EndSilenceTimeoutMs", this.silenceTimeout.toString());
    }
  }

  public setLanguages(sourceLanguage: string, targetLanguage: string): void {
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    
    if (this.speechConfig) {
      this.speechConfig.speechRecognitionLanguage = sourceLanguage;
    }
  }

  public setAIEnhancement(enabled: boolean): void {
    this.useAIEnhancement = enabled;
    console.log(`AI Enhancement ${enabled ? 'activado' : 'desactivado'}`);
  }

  public setCallbacks(
    onSegmentUpdate: (segment: AudioSegment) => void,
    onError: (error: string) => void
  ): void {
    this.onSegmentUpdate = onSegmentUpdate;
    this.onError = onError;
  }

  public async startListening(): Promise<void> {
    if (!this.speechConfig || !this.audioConfig) {
      this.onError?.('Speech configuration not initialized');
      return;
    }

    if (this.isListening) {
      console.log('Already listening');
      return;
    }

    try {
      this.recognizer = new SpeechRecognizer(this.speechConfig, this.audioConfig);
      this.isListening = true;
      this.lastSpeechTime = Date.now();

      // Manejo mejorado de resultados parciales
      this.recognizer.recognizing = (sender, event: SpeechRecognitionEventArgs) => {
        if (event.result.reason === ResultReason.RecognizingSpeech) {
          const text = event.result.text;
          this.lastSpeechTime = Date.now();
          
          if (text.trim() && text.length >= this.minSegmentLength) {
            this.handleInterimResult(text);
          }
        }
      };

      // Manejo mejorado de resultados finales
      this.recognizer.recognized = (sender, event: SpeechRecognitionEventArgs) => {
        if (event.result.reason === ResultReason.RecognizedSpeech) {
          const text = event.result.text;
          
          if (text.trim() && text.length >= this.minSegmentLength) {
            this.handleFinalResult(text, true); // true indica silencio detectado
          }
        }
      };

      // Manejo de errores mejorado
      this.recognizer.canceled = (sender, event) => {
        console.error('Recognition canceled:', event);
        this.handleRecognitionError(event.errorDetails);
      };

      // Manejo de sesión iniciada
      this.recognizer.sessionStarted = (sender, event) => {
        console.log('Sesión de reconocimiento iniciada');
        this.segmentStartTime = Date.now();
      };

      // Manejo de sesión finalizada
      this.recognizer.sessionStopped = (sender, event) => {
        console.log('Sesión de reconocimiento finalizada');
        this.finalizeCurrentSegment();
      };

      await this.recognizer.startContinuousRecognitionAsync();
      console.log('Reconocimiento continuo iniciado con configuración optimizada');
      
    } catch (error) {
      console.error('Error starting recognition:', error);
      this.onError?.(`Failed to start listening: ${error}`);
      this.isListening = false;
    }
  }

  private handleInterimResult(text: string): void {
    if (!text.trim() || text.length < this.minSegmentLength) return;

    const now = Date.now();
    
    // Crear o actualizar segmento actual
    if (!this.currentSegment || this.shouldCreateNewSegment(text)) {
      this.finalizeCurrentSegment(); // Finalizar el anterior si existe
      
      this.currentSegment = {
        id: this.segmentCounter++,
        originalText: text,
        translatedText: '',
        timestamp: now,
        status: SegmentStatus.RECORDING,
        isPartial: true,
        duration: 0,
        silenceDetected: false
      };
      
      this.segmentStartTime = now;
      console.log(`Nuevo segmento parcial creado: ${this.currentSegment.id}`);
    } else {
      // Actualizar segmento existente
      this.currentSegment.originalText = text;
      this.currentSegment.duration = now - this.segmentStartTime;
    }

    // Traducir en tiempo real
    this.translateSegment(this.currentSegment);
  }

  private handleFinalResult(text: string, silenceDetected: boolean = true): void {
    if (!text.trim() || text.length < this.minSegmentLength) return;

    const now = Date.now();

    // Finalizar segmento actual
    if (this.currentSegment) {
      this.currentSegment.originalText = text;
      this.currentSegment.isPartial = false;
      this.currentSegment.status = SegmentStatus.PROCESSING;
      this.currentSegment.silenceDetected = silenceDetected;
      this.currentSegment.duration = now - this.segmentStartTime;
    } else {
      // Crear nuevo segmento final
      this.currentSegment = {
        id: this.segmentCounter++,
        originalText: text,
        translatedText: '',
        timestamp: now,
        status: SegmentStatus.PROCESSING,
        isPartial: false,
        duration: now - this.segmentStartTime,
        silenceDetected: silenceDetected
      };
    }

    console.log(`Segmento final creado: ${this.currentSegment.id} (silencio: ${silenceDetected})`);
    
    // Almacenar en historial con orden cronológico
    this.segmentHistory.set(this.currentSegment.id, { ...this.currentSegment });
    
    // Traducir y finalizar
    this.translateSegment(this.currentSegment);
    
    // Limpiar para el siguiente segmento
    this.currentSegment = null;
  }

  private shouldCreateNewSegment(newText: string): boolean {
    if (!this.currentSegment) return true;
    
    const timeSinceLastUpdate = Date.now() - this.lastSpeechTime;
    const textLengthDifference = Math.abs(newText.length - this.currentSegment.originalText.length);
    
    // Crear nuevo segmento si:
    // 1. Ha pasado mucho tiempo desde la última actualización
    // 2. El texto es muy diferente (posible nueva oración)
    return timeSinceLastUpdate > this.silenceTimeout || textLengthDifference > 20;
  }

  private finalizeCurrentSegment(): void {
    if (this.currentSegment && !this.currentSegment.isPartial) {
      this.currentSegment.status = SegmentStatus.COMPLETED;
      this.segmentHistory.set(this.currentSegment.id, { ...this.currentSegment });
      this.onSegmentUpdate?.(this.currentSegment);
      console.log(`Segmento finalizado: ${this.currentSegment.id}`);
    }
  }

  private async translateSegment(segment: AudioSegment): Promise<void> {
    if (!segment.originalText.trim()) return;

    try {
      segment.status = SegmentStatus.PROCESSING;
      
      let translatedText = '';
      
      if (this.useAIEnhancement && !segment.isPartial && segment.originalText.length > 5) {
        // Usar mejora con IA para segmentos finales
        try {
          // Aquí se implementaría la llamada al servicio de IA
          // Por ahora usamos una traducción mejorada simulada
          translatedText = await this.simulateAITranslation(segment.originalText);
          console.log(`Traducción con IA aplicada para segmento ${segment.id}`);
        } catch (error) {
          console.error('Error en traducción con IA:', error);
          translatedText = this.getBasicTranslation(segment.originalText);
        }
      } else {
        // Traducción básica para segmentos parciales
        translatedText = this.getBasicTranslation(segment.originalText);
      }

      segment.translatedText = translatedText;
      segment.status = segment.isPartial ? SegmentStatus.RECORDING : SegmentStatus.COMPLETED;
      
      // Actualizar historial
      if (!segment.isPartial) {
        this.segmentHistory.set(segment.id, { ...segment });
      }
      
      this.onSegmentUpdate?.(segment);
      
    } catch (error) {
      console.error('Translation error:', error);
      segment.translatedText = `Error de traducción: ${error}`;
      segment.status = SegmentStatus.ERROR;
      this.onSegmentUpdate?.(segment);
    }
  }

  private async simulateAITranslation(text: string): Promise<string> {
    // Simulación de mejora con IA - aquí se integraría con el servicio real
    const delay = Math.random() * 500 + 200; // 200-700ms de delay simulado
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return `[AI Enhanced] ${this.getBasicTranslation(text)}`;
  }

  private getBasicTranslation(text: string): string {
    // Traducción básica placeholder
    const translations: Record<string, string> = {
      'hola': 'hello',
      'buenos días': 'good morning',
      'buenas tardes': 'good afternoon',
      'buenas noches': 'good evening',
      'gracias': 'thank you',
      'por favor': 'please',
      'lo siento': 'sorry',
      'disculpe': 'excuse me'
    };
    
    const lowerText = text.toLowerCase();
    for (const [spanish, english] of Object.entries(translations)) {
      if (lowerText.includes(spanish)) {
        return text.replace(new RegExp(spanish, 'gi'), english);
      }
    }
    
    return `[Translated] ${text}`;
  }

  private handleRecognitionError(errorDetails: string): void {
    console.error('Recognition error details:', errorDetails);
    this.isListening = false;
    
    if (this.currentSegment) {
      this.currentSegment.status = SegmentStatus.ERROR;
      this.currentSegment.translatedText = `Error: ${errorDetails}`;
      this.onSegmentUpdate?.(this.currentSegment);
    }
    
    this.onError?.(`Recognition error: ${errorDetails}`);
  }

  public async stopListening(): Promise<void> {
    if (!this.isListening || !this.recognizer) {
      return;
    }

    try {
      // Finalizar segmento actual antes de detener
      this.finalizeCurrentSegment();
      
      await this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer.close();
      this.recognizer = null;
      this.isListening = false;
      
      console.log('Reconocimiento detenido correctamente');
    } catch (error) {
      console.error('Error stopping recognition:', error);
      this.onError?.(`Error stopping recognition: ${error}`);
    }
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public clearHistory(): void {
    this.segmentHistory.clear();
    this.segmentCounter = 0;
    this.currentSegment = null;
    console.log('Historial de segmentos limpiado');
  }

  public getSegmentHistory(): AudioSegment[] {
    // Retornar segmentos ordenados cronológicamente
    return Array.from(this.segmentHistory.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  public getSegmentStats(): { total: number; completed: number; errors: number } {
    const segments = Array.from(this.segmentHistory.values());
    return {
      total: segments.length,
      completed: segments.filter(s => s.status === SegmentStatus.COMPLETED).length,
      errors: segments.filter(s => s.status === SegmentStatus.ERROR).length
    };
  }
}

// Instancia singleton exportada
export const realTimeTranslationService = new RealTimeTranslationService('', '');
