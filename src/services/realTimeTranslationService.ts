
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
  isPartial?: boolean;
  processed?: boolean;
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
  private segmentInterval: number = 3000;
  private captureTimer: NodeJS.Timeout | null = null;
  private isCapturingWhileSpeaking: boolean = false;
  private initialSilenceTimeoutMs: number = 5000;
  private endSilenceTimeoutMs: number = 500;
  private currentVoice: VoiceOption | null = null;
  private voiceSpeed: number = 1.1;
  private processedTexts: Set<string> = new Set();
  private playbackQueue: Promise<void> = Promise.resolve();

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
    console.log("Source language set to:", language);
  }

  public setTargetLanguage(language: string) {
    this.targetLanguage = language;
    console.log("Target language set to:", language);
  }
  
  public setVoice(voice: VoiceOption) {
    this.currentVoice = voice;
    console.log(`Voice set to: ${voice.name} (${voice.id})`);
  }
  
  public setVoiceSpeed(speed: number) {
    this.voiceSpeed = speed;
    console.log(`Voice speed set to: ${speed}x`);
  }
  
  public setSegmentDuration(durationMs: number) {
    this.segmentInterval = durationMs;
    console.log(`Segment duration set to ${durationMs}ms`);
  }
  
  public get isContinuousCapturing(): boolean {
    return this.isCapturingWhileSpeaking;
  }

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
    
    console.log("Starting real-time translation session...");
    this.processing = true;
    this.audioQueue = [];
    this.segmentCounter = 0;
    this.processedTexts.clear();
    this.playbackQueue = Promise.resolve();
    
    try {
      // Create translation recognizer
      const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      
      console.log(`Setting up translation: ${this.sourceLanguage} -> ${this.targetLanguage}`);
      translationConfig.speechRecognitionLanguage = this.sourceLanguage;
      translationConfig.addTargetLanguage(this.targetLanguage.split('-')[0]);

      // Configure for continuous recognition
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        this.initialSilenceTimeoutMs.toString()
      );
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        this.endSilenceTimeoutMs.toString()
      );
      
      // Setup audio config for microphone
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // Create translator with continuous recognition
      this.translationRecognizer = new sdk.TranslationRecognizer(
        translationConfig, 
        audioConfig
      );

      console.log("Translation recognizer created, setting up event handlers...");

      // Handle partial recognition events
      this.translationRecognizer.recognizing = (_, event) => {
        console.log("Recognizing event triggered:", event.result?.text);
        
        // Ignore recognition during playback to prevent feedback loops
        if (this.currentlyPlaying && !this.isCapturingWhileSpeaking) {
          console.log("Ignoring recognition during playback");
          return;
        }

        if (event.result && event.result.reason === sdk.ResultReason.TranslatingSpeech) {
          const partialText = event.result.text.trim();
          const partialTranslation = event.result.translations?.get(this.targetLanguage.split('-')[0]) || "";
          
          console.log(`Partial recognition: "${partialText}" -> "${partialTranslation}"`);
          
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
        console.log("Recognition event triggered:", event.result?.reason, event.result?.text);
        
        if (event.result && event.result.reason === sdk.ResultReason.TranslatedSpeech) {
          const originalText = event.result.text.trim();
          const translatedText = event.result.translations?.get(this.targetLanguage.split('-')[0]) || "";
          
          console.log(`Final recognition: "${originalText}" -> "${translatedText}"`);
          
          if (!originalText) {
            console.log("Skipping empty recognition result");
            return;
          }
          
          const finalKey = `${originalText}_${translatedText}`;
          if (this.processedTexts.has(finalKey)) {
            console.log(`Skipping duplicate segment: "${originalText}"`);
            return;
          }
          
          this.processedTexts.add(finalKey);
          const segmentId = this.segmentCounter++;
          
          console.log(`Creating segment ${segmentId}: "${originalText}" -> "${translatedText}"`);
          
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
        console.error(`Translation canceled: ${event.reason}`);
        if (event.reason === sdk.CancellationReason.Error) {
          console.error(`Translation error: ${event.errorCode} - ${event.errorDetails}`);
        }
      };

      this.translationRecognizer.sessionStarted = (_, event) => {
        console.log("Translation session started successfully");
        this.emit("sessionStarted", undefined);
      };

      this.translationRecognizer.sessionStopped = (_, event) => {
        console.log("Translation session stopped");
        this.emit("sessionEnded", undefined);
      };

      // Start continuous recognition
      console.log("Starting continuous recognition...");
      await this.translationRecognizer.startContinuousRecognitionAsync();
      console.log("Continuous recognition started successfully");
      
      // Enable capturing while speaking by default
      this.enableCapturingWhileSpeaking(true);
      
      console.log("Real-time translation session fully initialized");
    } catch (error) {
      console.error("Error starting translation session:", error);
      this.processing = false;
      throw error;
    }
  }

  public async stopSession(): Promise<void> {
    if (!this.processing) return;
    
    console.log("Stopping translation session...");
    
    if (this.translationRecognizer) {
      try {
        await this.translationRecognizer.stopContinuousRecognitionAsync();
        this.translationRecognizer.close();
        this.translationRecognizer = null;
        console.log("Translation recognizer stopped and closed");
      } catch (error) {
        console.error("Error stopping translation recognizer:", error);
      }
    }
    
    this.processing = false;
    this.emit("sessionEnded", undefined);
    console.log("Real-time translation session ended");
  }

  public enableCapturingWhileSpeaking(enabled: boolean): void {
    this.isCapturingWhileSpeaking = enabled;
    this.emit("simultaneousCapture", enabled);
    console.log(`Capturing while speaking: ${enabled ? "enabled" : "disabled"}`);
  }

  private async synthesizeSegment(segment: AudioSegment): Promise<void> {
    if (!this.config || !segment.translatedText || segment.processed) {
      console.error("Cannot synthesize - missing config, translated text, or already processed");
      return;
    }
    
    try {
      segment.status = SegmentStatus.SYNTHESIZING;
      segment.processed = true;
      this.emit("segmentUpdated", segment);
      console.log(`Synthesizing segment ${segment.id}: "${segment.translatedText}"`);
      
      // Configure speech synthesizer
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      speechConfig.speechSynthesisLanguage = this.targetLanguage;
      
      if (this.currentVoice) {
        speechConfig.speechSynthesisVoiceName = this.currentVoice.id;
        console.log(`Using voice: ${this.currentVoice.name} (${this.currentVoice.id})`);
      }
      
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_SynthOutputFormat, "audio-16khz-32kbitrate-mono-mp3");
      
      const pullStream = sdk.AudioOutputStream.createPullStream();
      const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream);
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      
      const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
        synthesizer.speakTextAsync(
          segment.translatedText!,
          (result) => {
            console.log(`Synthesis completed for segment ${segment.id}`);
            if (result && result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              resolve(result);
            } else {
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
      
      segment.audioData = result.audioData;
      segment.status = SegmentStatus.PLAYING;
      this.emit("segmentUpdated", segment);
      console.log(`Audio data ready for segment ${segment.id}`);
      
      this.queueSegmentForPlayback(segment);
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      segment.status = SegmentStatus.ERROR;
      this.emit("segmentError", { segment, error: error as Error });
    }
  }

  private queueSegmentForPlayback(segment: AudioSegment): void {
    if (!segment.audioData) {
      console.error(`Segment ${segment.id} has no audio data to play`);
      return;
    }
    
    console.log(`Queuing segment ${segment.id} for playback`);
    
    this.playbackQueue = this.playbackQueue.then(async () => {
      if (!segment.audioData) return;
      
      console.log(`Playing segment ${segment.id}`);
      this.currentlyPlaying = true;
      
      try {
        await this.playAudio(segment.audioData);
        
        segment.status = SegmentStatus.COMPLETED;
        this.emit("segmentCompleted", segment);
        console.log(`Playback completed for segment ${segment.id}`);
        
        this.audioQueue = this.audioQueue.filter(s => s.id !== segment.id);
      } catch (error) {
        console.error(`Error playing segment ${segment.id}:`, error);
        segment.status = SegmentStatus.ERROR;
        this.emit("segmentError", { segment, error: error as Error });
      } finally {
        this.currentlyPlaying = false;
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
      console.log("Audio decoded, duration:", audioBuffer.duration);
      
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.playbackRate.value = this.voiceSpeed;
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
    console.log("Disposing real-time translation service");
    
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
