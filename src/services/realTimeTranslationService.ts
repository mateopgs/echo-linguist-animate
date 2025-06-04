
import { 
  CognitiveServicesCredentials, 
  SpeechConfig, 
  AudioConfig, 
  SpeechRecognizer, 
  ResultReason,
  SpeechRecognitionEventArgs,
  SpeechRecognitionResult
} from 'microsoft-cognitiveservices-speech-sdk';
import { translateWithAI } from './azureOpenAIService';

export enum SegmentStatus {
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETED = 'completed'
}

export interface AudioSegment {
  id: number;
  originalText: string;
  translatedText: string;
  timestamp: number;
  status: SegmentStatus;
  isPartial: boolean;
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
  private segmentHistory: Map<number, string> = new Map();

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
      
      // Configure for real-time recognition
      this.speechConfig.setProperty("SpeechServiceConnection_InitialSilenceTimeoutMs", "5000");
      this.speechConfig.setProperty("SpeechServiceConnection_EndSilenceTimeoutMs", "500");
      this.speechConfig.setProperty("SpeechServiceConnection_EnableAudioLogging", "true");
      
      this.audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      
      console.log('Speech config initialized successfully');
    } catch (error) {
      console.error('Error initializing speech config:', error);
      this.onError?.(`Error initializing speech recognition: ${error}`);
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

      // Handle interim results for real-time feedback
      this.recognizer.recognizing = (sender, event: SpeechRecognitionEventArgs) => {
        if (event.result.reason === ResultReason.RecognizingSpeech) {
          const text = event.result.text;
          console.log('Interim result:', text);
          
          if (text.trim()) {
            this.handleInterimResult(text);
          }
        }
      };

      // Handle final results
      this.recognizer.recognized = (sender, event: SpeechRecognitionEventArgs) => {
        if (event.result.reason === ResultReason.RecognizedSpeech) {
          const text = event.result.text;
          console.log('Final result:', text);
          
          if (text.trim()) {
            this.handleFinalResult(text);
          }
        }
      };

      // Handle errors
      this.recognizer.canceled = (sender, event) => {
        console.error('Recognition canceled:', event);
        this.onError?.(`Recognition error: ${event.errorDetails}`);
        this.isListening = false;
      };

      // Start continuous recognition
      await this.recognizer.startContinuousRecognitionAsync();
      console.log('Started real-time speech recognition');
      
    } catch (error) {
      console.error('Error starting recognition:', error);
      this.onError?.(`Failed to start listening: ${error}`);
      this.isListening = false;
    }
  }

  private handleInterimResult(text: string): void {
    // Remove the problematic line that references non-existent property
    if (!text.trim()) return;

    // Create or update current segment for interim results
    if (!this.currentSegment) {
      this.currentSegment = {
        id: this.segmentCounter++,
        originalText: text,
        translatedText: '',
        timestamp: Date.now(),
        status: SegmentStatus.RECORDING,
        isPartial: true
      };
    } else {
      this.currentSegment.originalText = text;
      this.currentSegment.isPartial = true;
    }

    // Translate interim text
    this.translateSegment(this.currentSegment);
  }

  private handleFinalResult(text: string): void {
    if (!text.trim()) return;

    // Finalize current segment or create new one
    if (this.currentSegment) {
      this.currentSegment.originalText = text;
      this.currentSegment.isPartial = false;
      this.currentSegment.status = SegmentStatus.PROCESSING;
    } else {
      this.currentSegment = {
        id: this.segmentCounter++,
        originalText: text,
        translatedText: '',
        timestamp: Date.now(),
        status: SegmentStatus.PROCESSING,
        isPartial: false
      };
    }

    // Store in history and translate
    this.segmentHistory.set(this.currentSegment.id, text);
    this.translateSegment(this.currentSegment);
    
    // Reset for next segment
    this.currentSegment = null;
  }

  private async translateSegment(segment: AudioSegment): Promise<void> {
    try {
      let translatedText = '';
      
      if (this.useAIEnhancement && !segment.isPartial) {
        // Use AI-enhanced translation for final results
        const context = Array.from(this.segmentHistory.values()).slice(-3).join(' ');
        translatedText = await translateWithAI(
          segment.originalText,
          this.sourceLanguage,
          this.targetLanguage,
          context
        );
      } else {
        // Use simple translation (or implement basic translation service)
        translatedText = `[${segment.originalText}]`; // Placeholder
      }

      segment.translatedText = translatedText;
      segment.status = segment.isPartial ? SegmentStatus.RECORDING : SegmentStatus.COMPLETED;
      
      this.onSegmentUpdate?.(segment);
      
    } catch (error) {
      console.error('Translation error:', error);
      segment.translatedText = `Translation error: ${error}`;
      segment.status = SegmentStatus.COMPLETED;
      this.onSegmentUpdate?.(segment);
    }
  }

  public async stopListening(): Promise<void> {
    if (!this.isListening || !this.recognizer) {
      return;
    }

    try {
      await this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer.close();
      this.recognizer = null;
      this.isListening = false;
      console.log('Stopped real-time speech recognition');
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
  }
}
