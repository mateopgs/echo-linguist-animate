
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { AzureConfig } from "../types/voice-assistant";
import { EventEmitter } from "../utils/eventEmitter";

// Define the types and enums for the translation service
export enum SegmentStatus {
  RECORDING = "recording",
  TRANSCRIBING = "transcribing",
  TRANSLATING = "translating",
  SYNTHESIZING = "synthesizing",
  PLAYING = "playing",
  COMPLETED = "completed",
  ERROR = "error"
}

export interface AudioSegment {
  id: number;
  status: SegmentStatus;
  timestamp: number;
  originalText?: string;
  translatedText?: string;
  audioBuffer?: ArrayBuffer;
  error?: Error;
}

class RealTimeTranslationService extends EventEmitter {
  private config: AzureConfig | null = null;
  private isListening = false;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private synthesizer: sdk.SpeechSynthesizer | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private segmentCounter = 0;
  private activeSegments: AudioSegment[] = [];
  private sourceLanguage = "es-ES";
  private targetLanguage = "en-US";
  private segmentDuration = 1000; // Default to 1 second segments
  private capturingWhileSpeaking = true; // Default to capturing audio during speech playback
  private _wordCountThreshold: number = 10; // Default word count threshold
  
  // Getter and setter for wordCountThreshold
  public get wordCountThreshold(): number {
    return this._wordCountThreshold;
  }
  
  public set wordCountThreshold(value: number) {
    console.log(`Setting word count threshold to: ${value}`);
    this._wordCountThreshold = value;
  }

  // Configure the service with Azure credentials
  public setConfig(config: AzureConfig) {
    this.config = config;
    console.log("Real-time translation service config set");
    
    // Create audio context for playback
    try {
      this.audioContext = new AudioContext();
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
    }
  }
  
  // Set the source language for recognition
  public setSourceLanguage(language: string) {
    this.sourceLanguage = language;
  }
  
  // Set the target language for translation
  public setTargetLanguage(language: string) {
    this.targetLanguage = language;
  }
  
  // Set the duration of each segment in milliseconds
  public setSegmentDuration(duration: number) {
    this.segmentDuration = duration;
  }
  
  // Enable or disable capturing while speaking
  public enableCapturingWhileSpeaking(enabled: boolean) {
    this.capturingWhileSpeaking = enabled;
    this.emit("simultaneousCapture", enabled);
  }
  
  // Start the real-time translation session
  public async startSession() {
    if (!this.config) {
      throw new Error("Real-time translation service not configured");
    }
    
    if (this.isListening) {
      console.log("Session already active");
      return;
    }
    
    try {
      // Set up speech config
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      speechConfig.speechRecognitionLanguage = this.sourceLanguage;
      
      // Use shorter timeouts for more responsive experience
      speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        "5000"
      );
      speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        "1000"
      );
      
      // Setup audio config for microphone
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // Create recognizer
      this.recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      
      // Setup translation speech config
      const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      translationConfig.speechRecognitionLanguage = this.sourceLanguage;
      translationConfig.addTargetLanguage(this.targetLanguage.split('-')[0]); // "en-US" -> "en"
      
      // Setup synthesis config
      const synthesisConfig = sdk.SpeechConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      synthesisConfig.speechSynthesisLanguage = this.targetLanguage;
      
      // Use MP3 format which is more compatible
      synthesisConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_SynthOutputFormat, 
        "audio-16khz-32kbitrate-mono-mp3"
      );
      
      // Create pull stream to prevent automatic playback
      const pullStream = sdk.AudioOutputStream.createPullStream();
      const audioConfig2 = sdk.AudioConfig.fromStreamOutput(pullStream);
      this.synthesizer = new sdk.SpeechSynthesizer(synthesisConfig, audioConfig2);
      
      // Set up segment timer
      let currentSegment: AudioSegment | null = null;
      let segmentTimer: NodeJS.Timeout | null = null;
      let wordCount = 0;
      let hasWords = false;
      
      const createNewSegment = () => {
        if (currentSegment && !currentSegment.originalText) {
          // Current segment has no text, just reuse it
          return;
        }
        
        // Word count check
        if (currentSegment && currentSegment.originalText) {
          const words = currentSegment.originalText.trim().split(/\s+/);
          wordCount = words.length;
          
          // If word count exceeds threshold, start processing immediately
          if (wordCount >= this._wordCountThreshold && currentSegment.status === SegmentStatus.RECORDING) {
            console.log(`Word count threshold reached (${wordCount} words). Processing segment early.`);
            processSegment(currentSegment);
            
            // Create a new segment for continued recording
            const newSegment: AudioSegment = {
              id: ++this.segmentCounter,
              status: SegmentStatus.RECORDING,
              timestamp: Date.now()
            };
            this.activeSegments.push(newSegment);
            currentSegment = newSegment;
            this.emit("segmentCreated", newSegment);
            hasWords = false;
            wordCount = 0;
            return;
          }
        }
        
        // Create new segment for new audio
        const newSegment: AudioSegment = {
          id: ++this.segmentCounter,
          status: SegmentStatus.RECORDING,
          timestamp: Date.now()
        };
        this.activeSegments.push(newSegment);
        currentSegment = newSegment;
        this.emit("segmentCreated", newSegment);
        hasWords = false;
        wordCount = 0;
      };
      
      const processSegment = async (segment: AudioSegment) => {
        try {
          if (!segment.originalText || segment.originalText.trim() === "") {
            // Skip empty segments
            segment.status = SegmentStatus.COMPLETED;
            this.emit("segmentUpdated", segment);
            this.emit("segmentCompleted", segment);
            return;
          }
          
          // Update status for UI
          segment.status = SegmentStatus.TRANSLATING;
          this.emit("segmentUpdated", segment);
          
          // Simple translation using the source language and target language code
          const targetLangCode = this.targetLanguage.split('-')[0]; // "en-US" -> "en"
          const translator = new sdk.TranslationRecognizer(translationConfig);
          
          return new Promise<void>((resolve, reject) => {
            translator.recognizeOnceAsync(
              segment.originalText!,
              (result) => {
                if (result.reason === sdk.ResultReason.TranslatedSpeech) {
                  segment.translatedText = result.translations.get(targetLangCode) || "";
                  segment.status = SegmentStatus.SYNTHESIZING;
                  this.emit("segmentUpdated", segment);
                  
                  // Synthesize speech
                  if (this.synthesizer) {
                    this.synthesizer.speakTextAsync(
                      segment.translatedText,
                      (result) => {
                        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                          segment.audioBuffer = result.audioData;
                          segment.status = SegmentStatus.PLAYING;
                          this.emit("segmentUpdated", segment);
                          
                          // Play synthesized speech
                          try {
                            if (this.audioContext) {
                              this.audioContext.decodeAudioData(result.audioData).then(audioBuffer => {
                                this.sourceNode = this.audioContext!.createBufferSource();
                                this.sourceNode.buffer = audioBuffer;
                                
                                // Increase playback speed
                                this.sourceNode.playbackRate.value = 1.1; // 10% faster
                                
                                this.sourceNode.connect(this.audioContext!.destination);
                                
                                // Pause recording if configured
                                if (!this.capturingWhileSpeaking) {
                                  if (this.recognizer) {
                                    this.recognizer.stopContinuousRecognitionAsync();
                                  }
                                }
                                
                                // Set onended callback
                                this.sourceNode.onended = () => {
                                  segment.status = SegmentStatus.COMPLETED;
                                  this.emit("segmentUpdated", segment);
                                  this.emit("segmentCompleted", segment);
                                  
                                  // Resume recognition if paused and still in session
                                  if (!this.capturingWhileSpeaking && this.recognizer && this.isListening) {
                                    this.recognizer.startContinuousRecognitionAsync();
                                  }
                                  
                                  resolve();
                                };
                                
                                // Start playback
                                this.sourceNode.start();
                              }).catch(error => {
                                console.error("Error decoding audio data:", error);
                                segment.status = SegmentStatus.ERROR;
                                segment.error = error instanceof Error ? error : new Error(String(error));
                                this.emit("segmentUpdated", segment);
                                // Fix: Updated to emit segmentError with the correct object structure
                                this.emit("segmentError", { segment, error: segment.error });
                                resolve();
                              });
                            }
                          } catch (error) {
                            console.error("Error playing synthesized speech:", error);
                            segment.status = SegmentStatus.ERROR;
                            segment.error = error instanceof Error ? error : new Error(String(error));
                            this.emit("segmentUpdated", segment);
                            // Fix: Updated to emit segmentError with the correct object structure
                            this.emit("segmentError", { segment, error: segment.error });
                            resolve();
                          }
                        } else {
                          console.error("Speech synthesis failed:", result.reason);
                          segment.status = SegmentStatus.ERROR;
                          segment.error = new Error(`Speech synthesis failed: ${result.reason}`);
                          this.emit("segmentUpdated", segment);
                          // Fix: Updated to emit segmentError with the correct object structure
                          this.emit("segmentError", { segment, error: segment.error });
                          resolve();
                        }
                      },
                      (error) => {
                        console.error("Error synthesizing speech:", error);
                        segment.status = SegmentStatus.ERROR;
                        segment.error = new Error(String(error));
                        this.emit("segmentUpdated", segment);
                        // Fix: Updated to emit segmentError with the correct object structure
                        this.emit("segmentError", { segment, error: segment.error });
                        resolve();
                      }
                    );
                  } else {
                    console.error("Synthesizer not initialized");
                    segment.status = SegmentStatus.ERROR;
                    segment.error = new Error("Synthesizer not initialized");
                    this.emit("segmentUpdated", segment);
                    // Fix: Updated to emit segmentError with the correct object structure
                    this.emit("segmentError", { segment, error: segment.error });
                    resolve();
                  }
                } else {
                  console.error("Translation failed:", result.reason);
                  segment.status = SegmentStatus.ERROR;
                  segment.error = new Error(`Translation failed: ${result.reason}`);
                  this.emit("segmentUpdated", segment);
                  // Fix: Updated to emit segmentError with the correct object structure
                  this.emit("segmentError", { segment, error: segment.error });
                  resolve();
                }
              },
              (error) => {
                console.error("Error translating text:", error);
                segment.status = SegmentStatus.ERROR;
                segment.error = new Error(String(error));
                this.emit("segmentUpdated", segment);
                // Fix: Updated to emit segmentError with the correct object structure
                this.emit("segmentError", { segment, error: segment.error });
                resolve();
              }
            );
          });
        } catch (error) {
          console.error("Error processing segment:", error);
          segment.status = SegmentStatus.ERROR;
          segment.error = error instanceof Error ? error : new Error(String(error));
          this.emit("segmentUpdated", segment);
          // Fix: Updated to emit segmentError with the correct object structure
          this.emit("segmentError", { segment, error: segment.error });
        }
      };
      
      // Set up recognizer events
      this.recognizer.recognizing = (_, event) => {
        if (!this.isListening) return;
        
        if (event.result.reason === sdk.ResultReason.RecognizingSpeech) {
          const text = event.result.text;
          if (text.trim() !== "") {
            if (!currentSegment) {
              createNewSegment();
            }
            
            if (currentSegment) {
              currentSegment.originalText = text;
              this.emit("segmentUpdated", currentSegment);
              
              // Also emit a temporary update for UI
              this.emit("segmentUpdated", {
                id: -1,
                status: SegmentStatus.RECORDING,
                timestamp: Date.now(),
                originalText: text,
                translatedText: "" // Will be filled by translation later
              });
              
              // Check word count for early processing
              const words = text.trim().split(/\s+/);
              wordCount = words.length;
              
              if (!hasWords && wordCount > 0) {
                hasWords = true;
                
                // Reset segment timer when words start
                if (segmentTimer) {
                  clearInterval(segmentTimer);
                  segmentTimer = setInterval(() => {
                    if (currentSegment) {
                      processSegment(currentSegment);
                      currentSegment = null;
                    }
                    createNewSegment();
                  }, this.segmentDuration);
                }
              }
              
              // If word count exceeds threshold, process immediately
              if (wordCount >= this._wordCountThreshold && currentSegment.status === SegmentStatus.RECORDING) {
                console.log(`Word count threshold reached (${wordCount} words). Processing segment early.`);
                if (segmentTimer) {
                  clearInterval(segmentTimer);
                }
                
                const segmentToProcess = currentSegment;
                currentSegment = null;
                processSegment(segmentToProcess);
                createNewSegment();
                
                // Restart timer
                segmentTimer = setInterval(() => {
                  if (currentSegment) {
                    processSegment(currentSegment);
                    currentSegment = null;
                  }
                  createNewSegment();
                }, this.segmentDuration);
              }
            }
          }
        }
      };
      
      this.recognizer.recognized = (_, event) => {
        if (!this.isListening) return;
        
        if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
          const text = event.result.text;
          if (text.trim() !== "") {
            if (!currentSegment) {
              createNewSegment();
            }
            
            if (currentSegment) {
              currentSegment.originalText = text;
              this.emit("segmentUpdated", currentSegment);
              
              // Process this segment
              const segmentToProcess = currentSegment;
              currentSegment = null;
              processSegment(segmentToProcess);
              createNewSegment();
            }
          }
        }
      };
      
      // Initialize first segment
      createNewSegment();
      
      // Start segment timer
      segmentTimer = setInterval(() => {
        if (currentSegment) {
          processSegment(currentSegment);
          currentSegment = null;
        }
        createNewSegment();
      }, this.segmentDuration);
      
      // Start continuous recognition
      await this.recognizer.startContinuousRecognitionAsync();
      this.isListening = true;
      this.emit("sessionStarted");
      
      console.log("Real-time translation session started");
    } catch (error) {
      console.error("Error starting real-time translation:", error);
      this.isListening = false;
      throw error;
    }
  }
  
  // Stop the real-time translation session
  public async stopSession() {
    console.log("Stopping real-time translation session");
    this.isListening = false;
    
    if (this.recognizer) {
      try {
        await this.recognizer.stopContinuousRecognitionAsync();
        console.log("Recognition stopped");
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
    
    // Process any remaining segments
    for (const segment of this.activeSegments) {
      if (segment.status === SegmentStatus.RECORDING) {
        segment.status = SegmentStatus.COMPLETED;
        this.emit("segmentUpdated", segment);
        this.emit("segmentCompleted", segment);
      }
    }
    
    this.emit("sessionEnded");
  }
  
  // Clean up resources
  public dispose() {
    this.stopSession();
    
    if (this.recognizer) {
      this.recognizer.close();
      this.recognizer = null;
    }
    
    if (this.synthesizer) {
      this.synthesizer.close();
      this.synthesizer = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.activeSegments = [];
  }
}

export const realTimeTranslationService = new RealTimeTranslationService();
