import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { AzureConfig } from "../types/voice-assistant";
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
    
    try {
      // Create translation recognizer
      const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      
      translationConfig.speechRecognitionLanguage = this.sourceLanguage;
      translationConfig.addTargetLanguage(this.targetLanguage.split('-')[0]);

      // Configure for continuous recognition with segmentation
      // Tune silence detection to improve utterance capture
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        "10000" // wait up to 10s for initial speech
      );
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        this.segmentInterval.toString() // use configured segment interval for end silence
      );
      // Remove explicit segmentation override (Speech_SegmentationSilenceTimeoutMs)
      
      // Setup audio config for microphone
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // Create translator with continuous recognition
      this.translationRecognizer = new sdk.TranslationRecognizer(
        translationConfig, 
        audioConfig
      );

      // Handle recognition events
      this.translationRecognizer.recognizing = (_, event) => {
        // Ignore recognition during playback to prevent feedback loops
        if (this.currentlyPlaying) return;
        if (event.result.reason === sdk.ResultReason.TranslatingSpeech) {
          // This is interim recognition - could be used for real-time display
          console.log("Recognizing:", event.result.text);
          
          // Crear un segmento temporal para mostrar progreso
          const tempSegment: AudioSegment = {
            id: -1, // ID temporal
            timestamp: Date.now(),
            status: SegmentStatus.RECOGNIZING,
            originalText: event.result.text,
            translatedText: event.result.translations.get(this.targetLanguage.split('-')[0]) || ""
          };
          
          // Emitir un evento para actualizar la UI con reconocimiento provisional
          this.emit("segmentUpdated", tempSegment);
        }
      };

      // Handle final recognition results with translation
      this.translationRecognizer.recognized = (_, event) => {
        console.log("Recognition result reason:", event.result.reason);
        console.log("Recognition result text:", event.result.text);
        
        if (
          event.result.reason === sdk.ResultReason.TranslatedSpeech &&
          event.result.text.trim() !== ""
        ) {
          // Create a new segment
          const segmentId = this.segmentCounter++;
          const targetLang = this.targetLanguage.split('-')[0];
          const translation = event.result.translations.get(targetLang);
          
          console.log("Received translation:", translation);
          
          const segment: AudioSegment = {
            id: segmentId,
            timestamp: Date.now(),
            status: SegmentStatus.RECOGNIZING,
            originalText: event.result.text,
            translatedText: translation || ""
          };
          
          // Add to processing queue and emit event
          this.audioQueue.push(segment);
          this.emit("segmentCreated", segment);
          
          // Synthesize the translation
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
    
    this.captureTimer = setInterval(() => {
      if (this.currentlyPlaying && this.isCapturingWhileSpeaking && this.translationRecognizer) {
        console.log("Forcing segment creation while speaking");
        // Create a one-time event handler for the next recognition
        const originalHandler = this.translationRecognizer.recognized;
        
        // Store the original handler and set up a temporary wrapper
        if (originalHandler) {
          const tempHandler = (sender: sdk.TranslationRecognizer, event: sdk.TranslationRecognitionEventArgs) => {
            // Call the original handler
            originalHandler(sender, event);
            
            // Log the forced segment
            console.log("Forced segment recognition:", event.result.text);
            
            // Remove our temporary handler by restoring the original
            this.translationRecognizer!.recognized = originalHandler;
          };
          
          // Replace with our temporary handler
          this.translationRecognizer.recognized = tempHandler;
        }
      }
    }, this.segmentInterval);
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
    if (!this.config || !segment.translatedText) {
      console.error("Cannot synthesize - missing config or translated text");
      return;
    }
    
    try {
      segment.status = SegmentStatus.SYNTHESIZING;
      this.emit("segmentUpdated", segment);
      console.log(`Synthesizing segment ${segment.id}: "${segment.translatedText}"`);
      
      // Configure speech synthesizer
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      speechConfig.speechSynthesisLanguage = this.targetLanguage;
      // Use pull stream so SDK does not auto-play audio
      const pullStream = sdk.AudioOutputStream.createPullStream();
      const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream);
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      
      // Synthesize the translated text
      const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
        synthesizer.speakTextAsync(
          segment.translatedText!,
          (result) => {
            console.log(`Synthesis completed for segment ${segment.id}, reason: ${result.reason}`);
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              resolve(result);
            } else {
              console.error(`Synthesis failed: ${result.reason}`);
              reject(new Error(`Speech synthesis failed: ${result.reason}`));
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
      
      // Queue for playback
      this.playNextInQueue();
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      segment.status = SegmentStatus.ERROR;
      this.emit("segmentError", { segment, error: error as Error });
    }
  }

  // Play segments in chronological order
  private async playNextInQueue(): Promise<void> {
    if (this.currentlyPlaying) {
      console.log("Already playing audio, will play next segment when current completes");
      return;
    }
    
    if (this.audioQueue.length === 0) {
      console.log("Audio queue is empty, nothing to play");
      return;
    }
    
    // Sort by timestamp to ensure correct order
    this.audioQueue.sort((a, b) => a.timestamp - b.timestamp);
    
    // Find next segment with audio data ready for playback
    const nextSegmentIndex = this.audioQueue.findIndex(s => 
      s.status === SegmentStatus.PLAYING && s.audioData
    );
    
    if (nextSegmentIndex === -1) {
      console.log("No segments ready for playback yet");
      return;
    }
    
    // Process the next segment in the queue
    const segment = this.audioQueue[nextSegmentIndex];
    console.log(`Playing segment ${segment.id}: "${segment.translatedText}"`);
    this.currentlyPlaying = true;
    
    try {
      await this.playAudio(segment.audioData!);
      
      // Mark as completed
      segment.status = SegmentStatus.COMPLETED;
      this.emit("segmentCompleted", segment);
      console.log(`Playback completed for segment ${segment.id}`);
      
      // Remove completed segment from queue
      this.audioQueue.splice(nextSegmentIndex, 1);
    } catch (error) {
      console.error(`Error playing audio for segment ${segment.id}:`, error);
      segment.status = SegmentStatus.ERROR;
      this.emit("segmentError", { segment, error: error as Error });
    } finally {
      this.currentlyPlaying = false;
      
      // Check for more segments to play
      console.log("Checking for more segments to play");
      setTimeout(() => this.playNextInQueue(), 10);
    }
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
  }
}

export const realTimeTranslationService = new RealTimeTranslationService();
