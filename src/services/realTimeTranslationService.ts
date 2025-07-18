
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { AzureConfig, VoiceOption } from "../types/voice-assistant";
import { EventEmitter } from "../utils/eventEmitter";

// Segment processing states and events
export enum SegmentStatus {
  RECORDING,
  RECOGNIZING,
  TRANSLATING,
  SYNTHESIZING,
  PLAYING,
  COMPLETED,
  ERROR
}

export interface AudioSegment {
  id: number;
  timestamp: number;
  status: SegmentStatus;
  originalText?: string;
  translatedText?: string;
  audioData?: ArrayBuffer;
  isPartial?: boolean; // Para marcar segmentos parciales
  processed?: boolean; // Flag para evitar repetición
}

export interface TranslationEvents {
  segmentCreated: AudioSegment;
  segmentUpdated: AudioSegment;
  segmentCompleted: AudioSegment;
  segmentError: { segment: AudioSegment; error: Error };
  sessionStarted: void;
  sessionEnded: void;
  simultaneousCapture: boolean;
}

export class RealTimeTranslationService extends EventEmitter<TranslationEvents> {
  private config: AzureConfig | null = null;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private translationRecognizer: sdk.TranslationRecognizer | null = null;
  private synthesizer: sdk.SpeechSynthesizer | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioSegment[] = [];
  private currentlyPlaying: boolean = false;
  private segmentCounter: number = 0;
  private processing: boolean = false;
  private sourceLanguage: string = "es-ES";
  private targetLanguage: string = "en-US";
  private segmentInterval: number = 3000; // 3 seconds per segment by default
  private captureTimer: NodeJS.Timeout | null = null;
  private isCapturingWhileSpeaking: boolean = false;
  private initialSilenceTimeoutMs: number = 5000; // default initial silence timeout in ms
  private endSilenceTimeoutMs: number = 500; // default end silence timeout in ms
  private currentVoice: VoiceOption | null = null;
  private voiceSpeed: number = 1.1; // Velocidad por defecto
  private processedTexts: Set<string> = new Set(); // Set para controlar textos ya procesados
  private playbackQueue: Promise<void> = Promise.resolve(); // Cola para reproducción secuencial
  private selectedInputDevice: string = "default";
  private selectedOutputDevice: string = "default";

  constructor() {
    super();
    // Try to initialize audio context early
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
    }
  }

  public setConfig(config: AzureConfig) {
    this.config = config;
    console.log("Real-time Translation Service config set:", config);
  }

  public setSourceLanguage(language: string) {
    this.sourceLanguage = language;
  }

  public setTargetLanguage(language: string) {
    this.targetLanguage = language;
  }
  
  public setVoice(voice: VoiceOption) {
    this.currentVoice = voice;
    console.log(`Real-time Translation Service voice set to: ${voice.name} (${voice.id})`);
  }
  
  public setVoiceSpeed(speed: number) {
    this.voiceSpeed = speed;
    console.log(`Real-time Translation Service voice speed set to: ${speed}x`);
  }

  public setAudioDevices(inputDeviceId: string, outputDeviceId: string) {
    this.selectedInputDevice = inputDeviceId;
    this.selectedOutputDevice = outputDeviceId;
    console.log(`Real-time Translation Service audio devices set: input=${inputDeviceId}, output=${outputDeviceId}`);
  }

  private createAudioConfig(): sdk.AudioConfig {
    if (this.selectedInputDevice === "default") {
      return sdk.AudioConfig.fromDefaultMicrophoneInput();
    } else {
      return sdk.AudioConfig.fromMicrophoneInput(this.selectedInputDevice);
    }
  }
  
  public setSegmentDuration(durationMs: number) {
    this.segmentInterval = durationMs;
    console.log(`Segment duration set to ${durationMs}ms`);
    
    // Reiniciar el timer si está activo
    if (this.captureTimer) {
      this.stopPeriodicSegmentation();
      this.startPeriodicSegmentation();
    }
  }
  
  public get isContinuousCapturing(): boolean {
    return this.isCapturingWhileSpeaking;
  }

  /**
   * Configure silence detection timeouts for Azure translation recognizer.
   */
  public setSilenceTimeouts(initialMs: number, endMs: number) {
    this.initialSilenceTimeoutMs = initialMs;
    this.endSilenceTimeoutMs = endMs;
    console.log(`Silence timeouts set: initial=${initialMs}ms, end=${endMs}ms`);
  }

  public async startSession(): Promise<void> {
    if (!this.config) {
      throw new Error("Translation service not configured with Azure credentials");
    }

    if (this.processing) {
      console.warn("Session already in progress");
      return;
    }
    
    this.processing = true;
    this.audioQueue = [];
    this.segmentCounter = 0;
    this.processedTexts.clear(); // Limpiar textos procesados al iniciar
    this.playbackQueue = Promise.resolve(); // Reiniciar cola de reproducción
    
    try {
      // Create translation recognizer
      const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      
      translationConfig.speechRecognitionLanguage = this.sourceLanguage;
      translationConfig.addTargetLanguage(this.targetLanguage.split('-')[0]);

      // Configure for continuous recognition with segmentation
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        this.initialSilenceTimeoutMs.toString()
      );
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        this.endSilenceTimeoutMs.toString()
      );
      
      // Setup audio config for selected microphone
      const audioConfig = this.createAudioConfig();
      
      // Create translator with continuous recognition
      this.translationRecognizer = new sdk.TranslationRecognizer(
        translationConfig, 
        audioConfig
      );

      // Handle recognition events
      this.translationRecognizer.recognizing = (_, event) => {
        // Ignore recognition during playback to prevent feedback loops
        if (this.currentlyPlaying && !this.isCapturingWhileSpeaking) return;

        if (event.result && event.result.reason === sdk.ResultReason.TranslatingSpeech) {
          const partialText = event.result.text.trim();
          const partialTranslation = event.result.translations?.get(this.targetLanguage.split('-')[0]) || "";
          if (partialText) {
            const tempSegment: AudioSegment = {
              id: -1,
              timestamp: Date.now(),
              status: SegmentStatus.RECOGNIZING,
              originalText: partialText,
              translatedText: partialTranslation,
              isPartial: true
            };
            this.emit("segmentUpdated", tempSegment);
          }
        }
      };

      // Handle final recognition results with translation
      this.translationRecognizer.recognized = (_, event) => {
        if (event.result && event.result.reason === sdk.ResultReason.TranslatedSpeech) {
          const originalText = event.result.text.trim();
          const translatedText = event.result.translations?.get(this.targetLanguage.split('-')[0]) || "";
          if (!originalText) return;
          const finalKey = `${originalText}_${translatedText}`;
          if (this.processedTexts.has(finalKey)) {
            console.log(`Skipping duplicate segment: "${originalText}"`);
            return;
          }
          this.processedTexts.add(finalKey);
          const segmentId = this.segmentCounter++;
          console.log(`Creating segment: "${originalText}" -> "${translatedText}"`);
          const segment: AudioSegment = {
            id: segmentId,
            timestamp: Date.now(),
            status: SegmentStatus.TRANSLATING,
            originalText,
            translatedText,
            isPartial: false,
            processed: false
          };
          this.audioQueue.push(segment);
          this.emit("segmentCreated", segment);
          this.synthesizeSegment(segment);
        }
      };

      // Handle errors and session events
      this.translationRecognizer.canceled = (_, event) => {
        if (event.reason === sdk.CancellationReason.Error) {
          console.error(`Translation error: ${event.errorCode} - ${event.errorDetails}`);
        }
      };

      this.translationRecognizer.sessionStarted = (_, event) => {
        console.log("Translation session started");
        this.emit("sessionStarted", undefined);
        
        // Start the timer for segmenting speech while speaking
        this.startPeriodicSegmentation();
      };

      this.translationRecognizer.sessionStopped = (_, event) => {
        console.log("Translation session stopped");
        this.stopPeriodicSegmentation();
        this.emit("sessionEnded", undefined);
      };

      // Start continuous recognition
      await this.translationRecognizer.startContinuousRecognitionAsync();
      console.log("Continuous recognition started successfully");
      
      // Enable capturing while speaking by default
      this.enableCapturingWhileSpeaking(true);
      
      console.log("Real-time translation session started");
    } catch (error) {
      console.error("Error starting translation session:", error);
      this.processing = false;
      throw error;
    }
  }

  public async stopSession(): Promise<void> {
    if (!this.processing) return;
    
    this.stopPeriodicSegmentation();
    
    if (this.translationRecognizer) {
      try {
        await this.translationRecognizer.stopContinuousRecognitionAsync();
        this.translationRecognizer.close();
        this.translationRecognizer = null;
      } catch (error) {
        console.error("Error stopping translation recognizer:", error);
      }
    }
    
    this.processing = false;
    this.emit("sessionEnded", undefined);
    console.log("Real-time translation session ended");
  }

  // Enable or disable capturing while speaking
  public enableCapturingWhileSpeaking(enabled: boolean): void {
    this.isCapturingWhileSpeaking = enabled;
    this.emit("simultaneousCapture", enabled);
    console.log(`Capturing while speaking: ${enabled ? "enabled" : "disabled"}`);
    
    if (enabled) {
      this.startPeriodicSegmentation();
    } else {
      this.stopPeriodicSegmentation();
    }
  }
  
  // Start a timer to periodically segment speech
  private startPeriodicSegmentation(): void {
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
    }
    
    // Usar un intervalo más grande para evitar segmentación excesiva
    this.captureTimer = setInterval(() => {
      if (this.currentlyPlaying && this.isCapturingWhileSpeaking && this.translationRecognizer) {
        console.log("Forcing segment creation while speaking");
        
        // Limpiar mapas de control para permitir nuevos segmentos
        if (this.processedTexts.size > 100) {
          console.log("Limpiando caché de textos procesados...");
          this.processedTexts.clear();
        }
      }
    }, Math.max(this.segmentInterval, 700)); // Intervalo mínimo para evitar segmentación excesiva
  }
  
  // Stop the periodic segmentation timer
  private stopPeriodicSegmentation(): void {
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
  }

  // Process the segment through the TTS pipeline
  private async synthesizeSegment(segment: AudioSegment): Promise<void> {
    if (!this.config || !segment.translatedText || segment.processed) {
      console.error("Cannot synthesize - missing config, translated text, or already processed");
      return;
    }
    
    try {
      segment.status = SegmentStatus.SYNTHESIZING;
      segment.processed = true; // Marcar como procesado para evitar re-sintetizar
      this.emit("segmentUpdated", segment);
      console.log(`Synthesizing segment ${segment.id}: "${segment.translatedText}"`);
      
      // Configure speech synthesizer
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      speechConfig.speechSynthesisLanguage = this.targetLanguage;
      
      // Use selected voice if available
      if (this.currentVoice) {
        speechConfig.speechSynthesisVoiceName = this.currentVoice.id;
        console.log(`Using voice for synthesis: ${this.currentVoice.name} (${this.currentVoice.id})`);
      }
      
      // Optimización de configuración para síntesis
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_SynthOutputFormat, "audio-16khz-32kbitrate-mono-mp3");
      
      // Use pull stream so SDK does not auto-play audio
      const pullStream = sdk.AudioOutputStream.createPullStream();
      const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream);
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      
      // Synthesize the translated text
      const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
        synthesizer.speakTextAsync(
          segment.translatedText!,
          (result) => {
            console.log(`Synthesis completed for segment ${segment.id}, reason: ${result?.reason}`);
            if (result && result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              resolve(result);
            } else {
              console.error(`Synthesis failed: ${result?.reason}`);
              reject(new Error(`Speech synthesis failed: ${result?.reason}`));
            }
            synthesizer.close();
          },
          (error) => {
            console.error(`Synthesis error for segment ${segment.id}:`, error);
            reject(error);
            synthesizer.close();
          }
        );
      });
      
      // Update segment with audio data
      segment.audioData = result.audioData;
      segment.status = SegmentStatus.PLAYING;
      this.emit("segmentUpdated", segment);
      console.log(`Audio data ready for segment ${segment.id}, size: ${result.audioData.byteLength} bytes`);
      
      // Queue for sequential playback
      this.queueSegmentForPlayback(segment);
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      segment.status = SegmentStatus.ERROR;
      this.emit("segmentError", { segment, error: error as Error });
    }
  }

  // Agregar segmento a la cola de reproducción secuencial
  private queueSegmentForPlayback(segment: AudioSegment): void {
    if (!segment.audioData) {
      console.error(`Segment ${segment.id} has no audio data to play`);
      return;
    }
    
    console.log(`Queuing segment ${segment.id} for playback`);
    
    // Agregar a la cola de reproducción secuencial
    this.playbackQueue = this.playbackQueue.then(async () => {
      if (!segment.audioData) return;
      
      console.log(`Playing segment ${segment.id} from queue`);
      this.currentlyPlaying = true;
      
      try {
        await this.playAudio(segment.audioData);
        
        // Marcar como completado después de reproducirse
        segment.status = SegmentStatus.COMPLETED;
        this.emit("segmentCompleted", segment);
        console.log(`Playback completed for segment ${segment.id}`);
        
        // Eliminar de la cola de audio una vez completado
        this.audioQueue = this.audioQueue.filter(s => s.id !== segment.id);
      } catch (error) {
        console.error(`Error playing segment ${segment.id}:`, error);
        segment.status = SegmentStatus.ERROR;
        this.emit("segmentError", { segment, error: error as Error });
      } finally {
        this.currentlyPlaying = false;
        console.log(`Playback queue continues, segments remaining: ${this.audioQueue.length}`);
      }
    }).catch(error => {
      console.error("Error in playback queue:", error);
      this.currentlyPlaying = false;
    });
  }

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      console.log("Creating new audio context");
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      console.log("Decoding audio data...");
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      console.log("Audio data decoded successfully, duration:", audioBuffer.duration);
      
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      
      // Usar la velocidad de voz configurada
      sourceNode.playbackRate.value = this.voiceSpeed; 
      console.log(`Playback rate set to: ${this.voiceSpeed}x`);
      
      // Connect to the selected output device if supported
      if (this.selectedOutputDevice !== "default") {
        try {
          // Type-safe check for setSinkId support
          const audioContextWithSinkId = this.audioContext as AudioContext & { setSinkId?: (deviceId: string) => Promise<void> };
          if (audioContextWithSinkId.setSinkId) {
            await audioContextWithSinkId.setSinkId(this.selectedOutputDevice);
            console.log(`Audio output set to device: ${this.selectedOutputDevice}`);
          } else {
            console.warn("setSinkId not supported in this browser");
          }
        } catch (error) {
          console.warn("Failed to set audio output device:", error);
        }
      }
      
      sourceNode.connect(this.audioContext.destination);
      
      return new Promise<void>((resolve) => {
        sourceNode.onended = () => {
          console.log("Audio playback ended");
          resolve();
        };
        console.log("Starting audio playback");
        sourceNode.start(0);
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      throw error;
    }
  }

  public dispose() {
    this.stopPeriodicSegmentation();
    
    if (this.recognizer) {
      this.recognizer.close();
      this.recognizer = null;
    }
    if (this.translationRecognizer) {
      this.translationRecognizer.close();
      this.translationRecognizer = null;
    }
    if (this.synthesizer) {
      this.synthesizer.close();
      this.synthesizer = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.processing = false;
    this.audioQueue = [];
    this.processedTexts.clear();
    this.playbackQueue = Promise.resolve();
  }
}

export const realTimeTranslationService = new RealTimeTranslationService();
