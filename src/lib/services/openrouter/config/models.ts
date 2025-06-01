import { SupportedModel } from "../types";

/**
 * Model capabilities interface
 */
export interface ModelCapabilities {
  supportsVision: boolean;
  supportsJson: boolean;
  maxTokens: number;
  inputCostPer1K: number;
  outputCostPer1K: number;
  contextWindow: number;
}

/**
 * Model configuration interface
 */
export interface ModelConfig {
  id: SupportedModel;
  name: string;
  provider: string;
  description: string;
  capabilities: ModelCapabilities;
  defaultParams: {
    temperature: number;
    maxTokens: number;
    topP?: number;
  };
}

/**
 * Model configurations for all supported models
 */
export const MODEL_CONFIGS: Record<SupportedModel, ModelConfig> = {
  [SupportedModel.GOOGLE_GEMINI_2_5_FLASH_PREVIEW]: {
    id: SupportedModel.GOOGLE_GEMINI_2_5_FLASH_PREVIEW,
    name: "Gemini 2.5 Flash Preview",
    provider: "Google",
    description: "Fast and efficient model for general tasks",
    capabilities: {
      supportsVision: true,
      supportsJson: true,
      maxTokens: 8192,
      inputCostPer1K: 0.075,
      outputCostPer1K: 0.3,
      contextWindow: 1000000,
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.95,
    },
  },
  [SupportedModel.OPENGVLAB_INTERNVL3_14B_FREE]: {
    id: SupportedModel.OPENGVLAB_INTERNVL3_14B_FREE,
    name: "InternVL3 14B (Free)",
    provider: "OpenGVLab",
    description: "Free vision-language model with good performance",
    capabilities: {
      supportsVision: true,
      supportsJson: false,
      maxTokens: 4096,
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      contextWindow: 8192,
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
    },
  },
};

/**
 * Model manager for handling model configurations and selections
 */
export class ModelManager {
  /**
   * Gets configuration for a specific model
   * @param model - The model to get configuration for
   * @returns Model configuration
   */
  static getModelConfig(model: SupportedModel): ModelConfig {
    const config = MODEL_CONFIGS[model];
    if (!config) {
      throw new Error(`Unknown model: ${model}`);
    }
    return config;
  }

  /**
   * Gets all available models
   * @returns Array of all model configurations
   */
  static getAllModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS);
  }

  /**
   * Gets models by provider
   * @param provider - The provider to filter by
   * @returns Array of model configurations from the specified provider
   */
  static getModelsByProvider(provider: string): ModelConfig[] {
    return this.getAllModels().filter((model) => model.provider === provider);
  }

  /**
   * Gets free models (no cost)
   * @returns Array of free model configurations
   */
  static getFreeModels(): ModelConfig[] {
    return this.getAllModels().filter(
      (model) => model.capabilities.inputCostPer1K === 0 && model.capabilities.outputCostPer1K === 0
    );
  }

  /**
   * Gets models that support vision
   * @returns Array of vision-capable model configurations
   */
  static getVisionModels(): ModelConfig[] {
    return this.getAllModels().filter((model) => model.capabilities.supportsVision);
  }

  /**
   * Gets models that support structured JSON output
   * @returns Array of JSON-capable model configurations
   */
  static getJsonModels(): ModelConfig[] {
    return this.getAllModels().filter((model) => model.capabilities.supportsJson);
  }

  /**
   * Estimates cost for a request
   * @param model - The model to estimate cost for
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @returns Estimated cost in USD
   */
  static estimateCost(model: SupportedModel, inputTokens: number, outputTokens: number): number {
    const config = this.getModelConfig(model);
    const inputCost = (inputTokens / 1000) * config.capabilities.inputCostPer1K;
    const outputCost = (outputTokens / 1000) * config.capabilities.outputCostPer1K;
    return inputCost + outputCost;
  }

  /**
   * Validates if a model supports the requested features
   * @param model - The model to validate
   * @param requiresVision - Whether vision support is required
   * @param requiresJson - Whether JSON support is required
   * @returns True if model supports all required features
   */
  static validateModelCapabilities(model: SupportedModel, requiresVision = false, requiresJson = false): boolean {
    const config = this.getModelConfig(model);

    if (requiresVision && !config.capabilities.supportsVision) {
      return false;
    }

    if (requiresJson && !config.capabilities.supportsJson) {
      return false;
    }

    return true;
  }

  /**
   * Recommends the best model for given requirements
   * @param requirements - Requirements for model selection
   * @returns Recommended model
   */
  static recommendModel(requirements: {
    needsVision?: boolean;
    needsJson?: boolean;
    maxCost?: number;
    preferFree?: boolean;
    complexity?: "simple" | "medium" | "complex";
  }): SupportedModel {
    let candidates = this.getAllModels();

    // Filter by requirements
    if (requirements.needsVision) {
      candidates = candidates.filter((model) => model.capabilities.supportsVision);
    }

    if (requirements.needsJson) {
      candidates = candidates.filter((model) => model.capabilities.supportsJson);
    }

    if (requirements.preferFree) {
      const freeModels = candidates.filter((model) => model.capabilities.inputCostPer1K === 0);
      if (freeModels.length > 0) {
        candidates = freeModels;
      }
    }

    if (requirements.maxCost !== undefined) {
      // Estimate cost for 1000 input + 500 output tokens
      candidates = candidates.filter((model) => {
        const estimatedCost = this.estimateCost(model.id, 1000, 500);
        return estimatedCost <= (requirements.maxCost ?? 0);
      });
    }

    // Sort by complexity preference
    if (requirements.complexity) {
      candidates.sort((a, b) => {
        if (requirements.complexity === "simple") {
          return a.capabilities.inputCostPer1K - b.capabilities.inputCostPer1K;
        } else if (requirements.complexity === "complex") {
          return b.capabilities.maxTokens - a.capabilities.maxTokens;
        }
        return 0;
      });
    }

    if (candidates.length === 0) {
      return SupportedModel.OPENGVLAB_INTERNVL3_14B_FREE; // Fallback to free model
    }

    return candidates[0].id;
  }

  /**
   * Get the cheapest available model
   * @returns The most cost-effective model
   */
  getCheapestModel(): SupportedModel {
    return SupportedModel.OPENGVLAB_INTERNVL3_14B_FREE; // Free model
  }
}
