
import { AzureConfig } from "../types/voice-assistant";

export type AzureOpenAIConfig = {
  key: string;
  endpoint: string;
  apiVersion: string;
  deploymentName: string;
};

class AzureOpenAIService {
  private config: AzureOpenAIConfig | null = null;
  private conversationHistory: { role: string; content: string }[] = [];
  private maxHistoryLength: number = 10; // Mantener un máximo de 10 mensajes en el historial

  constructor() {
    // Inicializar con las credenciales proporcionadas
    this.setConfig({
      key: "3T3EuIFcgBiqLGtRbSd9PywVHAKw2RsbnROSIdWCmhPdvkIPnfD0JQQJ99BDACHYHv6XJ3w3AAAAACOGONVI",
      endpoint: "https://ai-mateo5227ai919927469639.openai.azure.com/",
      apiVersion: "2024-12-01-preview",
      deploymentName: "gpt-4o-mini"
    });
    
    // Inicializar el historial de conversación con un mensaje del sistema
    this.conversationHistory.push({
      role: "system",
      content: "Eres un asistente especializado en mejorar traducciones y mantener el contexto de conversaciones."
    });
  }

  public setConfig(config: AzureOpenAIConfig) {
    this.config = config;
    console.log("Azure OpenAI Service configurado:", config.endpoint);
  }

  public clearHistory() {
    // Mantener solo el mensaje del sistema
    this.conversationHistory = this.conversationHistory.slice(0, 1);
    console.log("Historial de conversación reiniciado");
  }

  public async improveTranslation(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    if (!this.config) {
      console.error("Azure OpenAI Service no configurado");
      return translatedText; // Devolver traducción original si no hay configuración
    }

    try {
      console.log(`Mejorando traducción con OpenAI: "${translatedText}"`);
      const sourceLangCode = sourceLanguage.split('-')[0];
      const targetLangCode = targetLanguage.split('-')[0];

      // Crear prompt para el modelo
      const userPrompt = `
Texto original (${sourceLangCode}): "${originalText}"
Traducción automática (${targetLangCode}): "${translatedText}"

Proporciona una versión mejorada de la traducción que suene natural y fluida en ${targetLangCode}. 
Mantén el mismo significado y contexto del texto original, pero mejora el lenguaje y la naturalidad.
Responde ÚNICAMENTE con el texto traducido mejorado, sin explicaciones ni comentarios adicionales.`;

      // Añadir el mensaje del usuario al historial
      this.conversationHistory.push({
        role: "user",
        content: userPrompt
      });

      // Preparar la solicitud para Azure OpenAI
      const response = await fetch(`${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.config.key,
        },
        body: JSON.stringify({
          model: this.config.deploymentName,
          messages: this.conversationHistory,
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Error en la llamada a Azure OpenAI:", errorData);
        return translatedText; // Devolver la traducción original si hay error
      }

      const data = await response.json();
      const improvedTranslation = data.choices[0].message.content.trim();
      
      // Añadir la respuesta del asistente al historial
      this.conversationHistory.push({
        role: "assistant",
        content: improvedTranslation
      });
      
      // Limitar el tamaño del historial
      if (this.conversationHistory.length > this.maxHistoryLength + 1) { // +1 para el mensaje del sistema
        // Mantener el mensaje del sistema y los mensajes más recientes
        this.conversationHistory = [
          this.conversationHistory[0],
          ...this.conversationHistory.slice(-(this.maxHistoryLength))
        ];
      }
      
      console.log(`Traducción mejorada: "${improvedTranslation}"`);
      console.log(`Estado del historial: ${this.conversationHistory.length - 1} mensajes`);
      return improvedTranslation;
    } catch (error) {
      console.error("Error al mejorar la traducción:", error);
      return translatedText; // Devolver traducción original en caso de error
    }
  }

  public async getContextualResponse(query: string, language: string): Promise<string> {
    if (!this.config) {
      console.error("Azure OpenAI Service no configurado");
      return "No puedo procesar tu consulta en este momento.";
    }

    try {
      const langCode = language.split('-')[0];
      
      // Crear prompt para consulta contextual
      const userPrompt = `La siguiente es una consulta en ${langCode}. Responde de manera concisa y natural en ${langCode}: "${query}"`;
      
      // Añadir consulta al historial
      this.conversationHistory.push({
        role: "user",
        content: userPrompt
      });

      const response = await fetch(`${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.config.key,
        },
        body: JSON.stringify({
          model: this.config.deploymentName,
          messages: this.conversationHistory,
          max_tokens: 1000,
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Error en consulta contextual:", errorData);
        return "Lo siento, no pude procesar tu consulta.";
      }

      const data = await response.json();
      const answer = data.choices[0].message.content.trim();
      
      // Añadir respuesta al historial
      this.conversationHistory.push({
        role: "assistant",
        content: answer
      });
      
      // Limitar tamaño del historial
      if (this.conversationHistory.length > this.maxHistoryLength + 1) {
        this.conversationHistory = [
          this.conversationHistory[0],
          ...this.conversationHistory.slice(-(this.maxHistoryLength))
        ];
      }
      
      console.log(`Respuesta contextual generada: "${answer.substring(0, 50)}..."`);
      return answer;
    } catch (error) {
      console.error("Error al generar respuesta contextual:", error);
      return "Lo siento, ocurrió un error al procesar tu consulta.";
    }
  }
}

export const azureOpenAIService = new AzureOpenAIService();
