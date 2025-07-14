
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { AzureConfig, SupportedLanguages, VoiceOption } from "../types/voice-assistant";

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

// Voces predeterminadas para los idiomas principales
const defaultVoices: VoiceOption[] = [
  // Español
  { id: "es-ES-ElviraNeural", name: "Elvira", gender: "Female", isNeural: true, locale: "es-ES" },
  { id: "es-ES-AlvaroNeural", name: "Alvaro", gender: "Male", isNeural: true, locale: "es-ES" },
  { id: "es-ES-AbrilNeural", name: "Abril", gender: "Female", isNeural: true, locale: "es-ES" },
  // Inglés - EEUU
  { id: "en-US-JennyNeural", name: "Jenny", gender: "Female", isNeural: true, locale: "en-US" },
  { id: "en-US-GuyNeural", name: "Guy", gender: "Male", isNeural: true, locale: "en-US" },
  { id: "en-US-AriaNeural", name: "Aria", gender: "Female", isNeural: true, locale: "en-US" },
  // Francés
  { id: "fr-FR-DeniseNeural", name: "Denise", gender: "Female", isNeural: true, locale: "fr-FR" },
  { id: "fr-FR-HenriNeural", name: "Henri", gender: "Male", isNeural: true, locale: "fr-FR" },
  // Alemán
  { id: "de-DE-KatjaNeural", name: "Katja", gender: "Female", isNeural: true, locale: "de-DE" },
  { id: "de-DE-ConradNeural", name: "Conrad", gender: "Male", isNeural: true, locale: "de-DE" },
  // Italiano
  { id: "it-IT-IsabellaNeural", name: "Isabella", gender: "Female", isNeural: true, locale: "it-IT" },
  { id: "it-IT-DiegoNeural", name: "Diego", gender: "Male", isNeural: true, locale: "it-IT" },
  // Portugués
  { id: "pt-BR-FranciscaNeural", name: "Francisca", gender: "Female", isNeural: true, locale: "pt-BR" },
  { id: "pt-BR-AntonioNeural", name: "Antonio", gender: "Male", isNeural: true, locale: "pt-BR" },
  // Japonés
  { id: "ja-JP-NanamiNeural", name: "Nanami", gender: "Female", isNeural: true, locale: "ja-JP" },
  { id: "ja-JP-KeitaNeural", name: "Keita", gender: "Male", isNeural: true, locale: "ja-JP" },
  // Chino
  { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao", gender: "Female", isNeural: true, locale: "zh-CN" },
  { id: "zh-CN-YunxiNeural", name: "Yunxi", gender: "Male", isNeural: true, locale: "zh-CN" },
  // Ruso
  { id: "ru-RU-SvetlanaNeural", name: "Svetlana", gender: "Female", isNeural: true, locale: "ru-RU" },
  { id: "ru-RU-DmitryNeural", name: "Dmitry", gender: "Male", isNeural: true, locale: "ru-RU" },
  // Coreano
  { id: "ko-KR-SunHiNeural", name: "SunHi", gender: "Female", isNeural: true, locale: "ko-KR" },
  { id: "ko-KR-InJoonNeural", name: "InJoon", gender: "Male", isNeural: true, locale: "ko-KR" },
];

class AzureSpeechService {
  private config: AzureConfig | null = null;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private synthesizer: sdk.SpeechSynthesizer | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private currentVoice: VoiceOption | null = null;
  private voiceSpeed: number = 1.1; // Velocidad por defecto
  private selectedInputDevice: string = "default";
  private selectedOutputDevice: string = "default";

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
  
  public getSupportedVoices() {
    // Return default voices until we can fetch from Azure
    return Promise.resolve(defaultVoices);
  }
  
  public setVoice(voice: VoiceOption) {
    this.currentVoice = voice;
    console.log("Voice set to:", voice);
  }

  public setVoiceSpeed(speed: number) {
    this.voiceSpeed = speed;
    console.log("Voice speed set to:", speed);
  }

  public setAudioDevices(inputDeviceId: string, outputDeviceId: string) {
    this.selectedInputDevice = inputDeviceId;
    this.selectedOutputDevice = outputDeviceId;
    console.log(`Audio devices set: input=${inputDeviceId}, output=${outputDeviceId}`);
  }

  private createAudioConfig(): sdk.AudioConfig {
    if (this.selectedInputDevice === "default") {
      return sdk.AudioConfig.fromDefaultMicrophoneInput();
    } else {
      return sdk.AudioConfig.fromMicrophoneInput(this.selectedInputDevice);
    }
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
      
      // Reducir tiempos de espera para mayor rapidez
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        "5000"
      );
      translationConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        "500"
      );

      // Setup audio config for selected microphone
      const audioConfig = this.createAudioConfig();
      
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
      
      // Si hay una voz seleccionada para el idioma, usarla
      if (this.currentVoice) {
        speechConfig.speechSynthesisVoiceName = this.currentVoice.id;
        console.log(`Using voice: ${this.currentVoice.name} (${this.currentVoice.id})`);
      }
      
      // Remove the problematic property and use other optimization settings
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_SynthOutputFormat, "audio-16khz-32kbitrate-mono-mp3");

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
      
      // Usar la velocidad de reproducción configurada
      this.sourceNode.playbackRate.value = this.voiceSpeed;
      console.log(`Playback rate set to: ${this.voiceSpeed}x`);
      
      // Connect to the selected output device if supported
      if (this.selectedOutputDevice !== "default" && this.audioContext.setSinkId) {
        try {
          await (this.audioContext as any).setSinkId(this.selectedOutputDevice);
          console.log(`Audio output set to device: ${this.selectedOutputDevice}`);
        } catch (error) {
          console.warn("Failed to set audio output device:", error);
        }
      }
      
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
