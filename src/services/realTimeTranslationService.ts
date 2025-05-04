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
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, 
        "5000"
      );
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, 
        "1000"
      );
      translationConfig.setProperty(
        sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs,
        this.segmentInterval.toString()
      );
      
      // Setup audio config for microphone
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // Create translator with continuous recognition
      this.translationRecognizer = new sdk.TranslationRecognizer(
        translationConfig, 
        audioConfig
      );

      // Handle recognition events
      this.translationRecognizer.recognizing = (_, event) => {
        if (event.result.reason === sdk.ResultReason.TranslatingSpeech) {
          // This is interim recognition - could be used for real-time display
          console.log("Recognizing:", event.result.text);
        }
      };

      // Handle final recognition results with translation
      this.translationRecognizer.recognized = (_, event) => {
        if (
          event.result.reason === sdk.ResultReason.TranslatedSpeech &&
          event.result.text.trim() !== ""
        ) {
          // Create a new segment
          const segmentId = this.segmentCounter++;
          const targetLang = this.targetLanguage.split('-')[0];
          
          const segment: AudioSegment = {
            id: segmentId,
            timestamp: Date.now(),
            status: SegmentStatus.RECOGNIZING,
            originalText: event.result.text,
            translatedText: event.result.translations.get(targetLang) || ""
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
    if (!this.config || !segment.translatedText) return;
    
    try {
      segment.status = SegmentStatus.SYNTHESIZING;
      this.emit("segmentUpdated", segment);
      
      // Configure speech synthesizer
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      speechConfig.speechSynthesisLanguage = this.targetLanguage;
      
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
      
      // Synthesize the translated text
      const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
        synthesizer.speakTextAsync(
          segment.translatedText!,
          (result) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              resolve(result);
            } else {
              reject(new Error(`Speech synthesis failed: ${result.reason}`));
            }
            synthesizer.close();
          },
          (error) => {
            reject(error);
            synthesizer.close();
          }
        );
      });
      
      // Update segment with audio data
      segment.audioData = result.audioData;
      segment.status = SegmentStatus.PLAYING;
      this.emit("segmentUpdated", segment);
      
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
    if (this.currentlyPlaying || this.audioQueue.length === 0) return;
    
    // Sort by timestamp to ensure correct order
    this.audioQueue.sort((a, b) => a.timestamp - b.timestamp);
    
    // Find next segment with audio data ready for playback
    const nextSegmentIndex = this.audioQueue.findIndex(s => 
      s.status === SegmentStatus.PLAYING && s.audioData
    );
    
    if (nextSegmentIndex === -1) return;
    
    // Process the next segment in the queue
    const segment = this.audioQueue[nextSegmentIndex];
    this.currentlyPlaying = true;
    
    try {
      await this.playAudio(segment.audioData!);
      
      // Mark as completed
      segment.status = SegmentStatus.COMPLETED;
      this.emit("segmentCompleted", segment);
      
      // Remove completed segment from queue
      this.audioQueue.splice(nextSegmentIndex, 1);
    } catch (error) {
      console.error("Error playing audio:", error);
      segment.status = SegmentStatus.ERROR;
      this.emit("segmentError", { segment, error: error as Error });
    } finally {
      this.currentlyPlaying = false;
      
      // Check for more segments to play
      setTimeout(() => this.playNextInQueue(), 10);
    }
  }

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.audioContext.destination);
      
      return new Promise<void>((resolve) => {
        sourceNode.onended = () => resolve();
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
