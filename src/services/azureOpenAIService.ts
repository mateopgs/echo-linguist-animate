
import { AzureConfig } from "../types/voice-assistant";

export type AzureOpenAIConfig = {
  key: string;
  endpoint: string;
  apiVersion: string;
  deploymentName: string;
};

class AzureOpenAIService {
  private config: AzureOpenAIConfig | null = null;

  constructor() {
    // Inicializar con las credenciales proporcionadas
    this.setConfig({
      key: "3T3EuIFcgBiqLGtRbSd9PywVHAKw2RsbnROSIdWCmhPdvkIPnfD0JQQJ99BDACHYHv6XJ3w3AAAAACOGONVI",
      endpoint: "https://ai-mateo5227ai919927469639.openai.azure.com/",
      apiVersion: "2024-12-01-preview",
      deploymentName: "gpt-4o-mini"
    });
  }

  public setConfig(config: AzureOpenAIConfig) {
    this.config = config;
    console.log("Azure OpenAI Service configurado:", config.endpoint);
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
      const prompt = `
Eres un asistente de traducción especializado. Tu trabajo es revisar y mejorar traducciones automáticas.

Texto original (${sourceLangCode}): "${originalText}"
Traducción automática (${targetLangCode}): "${translatedText}"

Proporciona una versión mejorada de la traducción que suene natural y fluida en ${targetLangCode}. 
Mantén el mismo significado y contexto del texto original, pero mejora el lenguaje y la naturalidad. 
Responde ÚNICAMENTE con el texto traducido mejorado, sin explicaciones ni comentarios adicionales.`;

      // Preparar la solicitud para Azure OpenAI
      const response = await fetch(`${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.config.key,
        },
        body: JSON.stringify({
          model: this.config.deploymentName,
          messages: [
            {
              role: "system",
              content: "Eres un asistente especializado en mejorar traducciones para hacerlas fluidas y naturales."
            },
            {
              role: "user",
              content: prompt
            }
          ],
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
      
      console.log(`Traducción mejorada: "${improvedTranslation}"`);
      return improvedTranslation;
    } catch (error) {
      console.error("Error al mejorar la traducción:", error);
      return translatedText; // Devolver traducción original en caso de error
    }
  }
}

export const azureOpenAIService = new AzureOpenAIService();
