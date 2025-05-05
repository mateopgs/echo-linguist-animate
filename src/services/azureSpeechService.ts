import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { AzureConfig, SupportedLanguages } from "../types/voice-assistant";

const defaultLanguages = [
  { code: "en-US", name: "English", nativeName: "English" },
  { code: "es-ES", name: "Spanish", nativeName: "Español" },
  { code: "fr-FR", name: "French", nativeName: "Français" },
  { code: "de-DE", name: "German", nativeName: "Deutsch" },
  { code: "it-IT", name: "Italian", nativeName: "Italiano" },
  { code: "ja-JP", name: "Japanese", nativeName: "日本語" },
  { code: "ko-KR", name: "Korean", nativeName: "한국어" },
  { code: "pt-BR", name: "Portuguese", nativeName: "Português" },
  { code: "ru-RU", name: "Russian", nativeName: "Русский" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文" }
];

class AzureSpeechService {
  private config: AzureConfig | null = null;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private synthesizer: sdk.SpeechSynthesizer | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  public setConfig(config: AzureConfig) {
    this.config = config;
    console.log("Azure Speech Service config set:", config);
    
    // Create audio context for playback
    try {
      this.audioContext = new AudioContext();
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
    }
  }

  public getSupportedLanguages() {
    // Return default languages until we can fetch from Azure
    return Promise.resolve(defaultLanguages);
  }

  public async startRecognition(
    fromLanguage: string,
    toLanguage: string,
    onInterimResult: (result: string) => void,
    onFinalResult: (originalText: string, translatedText: string) => void
  ) {
    if (!this.config) {
      throw new Error("Azure Speech Service not configured");
    }

    console.log(`Starting recognition from ${fromLanguage} to ${toLanguage}`);
    
    try {
      // Set up speech config
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.key, 
        this.config.region
      );
      speechConfig.speechRecognitionLanguage = fromLanguage;
      
      // Create translation config with target language
      const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
        this.config.key,
        this.config.region
      );
      translationConfig.speechRecognitionLanguage = fromLanguage;
      translationConfig.addTargetLanguage(toLanguage.split('-')[0]); // "es-ES" -> "es"

      // Setup audio config for microphone
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // Create translator
      const translator = new sdk.TranslationRecognizer(translationConfig, audioConfig);

      // Handle recognition results
      translator.recognized = (_, event) => {
        if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
          const originalText = event.result.text;
          const translatedText = event.result.translations.get(toLanguage.split('-')[0]) || "";
          onFinalResult(originalText, translatedText);
        }
      };

      translator.recognizing = (_, event) => {
        if (event.result.reason === sdk.ResultReason.RecognizingSpeech) {
          onInterimResult(event.result.text);
        }
      };

      // Start continuous recognition
      await translator.startContinuousRecognitionAsync();
      
      return {
        stop: async () => {
          await translator.stopContinuousRecognitionAsync();
          translator.close();
        }
      };
    } catch (error) {
      console.error("Error starting recognition:", error);
      throw error;
    }
  }

  public async synthesizeSpeech(text: string, language: string): Promise<ArrayBuffer> {
    if (!this.config) {
      throw new Error("Azure Speech Service not configured");
    }

    console.log(`Synthesizing speech in ${language}: ${text}`);
    
    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.key, 
        this.config.region
      );
      speechConfig.speechSynthesisLanguage = language;

      // Create pull stream to prevent automatic playback
      const pullAudioOutputStream = sdk.AudioOutputStream.createPullStream();
      const audioConfig = sdk.AudioConfig.fromStreamOutput(pullAudioOutputStream);
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      
      return new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              resolve(result.audioData);
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
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      throw error;
    }
  }

  public async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    try {
      console.log("Playing audio...");
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = audioBuffer;
      this.sourceNode.connect(this.audioContext.destination);
      
      return new Promise((resolve) => {
        this.sourceNode!.onended = () => {
          resolve();
        };
        this.sourceNode!.start(0);
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      throw error;
    }
  }

  public dispose() {
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
  }
}

export const azureSpeechService = new AzureSpeechService();
