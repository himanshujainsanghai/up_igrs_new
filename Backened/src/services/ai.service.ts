/**
 * AI Service using OpenRouter
 * Provides LLM access through OpenRouter unified API
 * Supports multiple models: Claude, GPT-4, GPT-4o, Llama, etc.
 */

import { env } from "../config/env";
import logger from "../config/logger";
import { AIStepExecutionInstruction } from "../models/AIStepExecutionInstruction";
import { AIResolutionStep } from "../models/AIResolutionStep";
import { Complaint } from "../models/Complaint";
import { NotFoundError } from "../utils/errors";

// OpenRouter Configuration
const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || env.OPENAI_API_KEY || ""; // Fallback to OpenAI key if needed
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default model configuration
const DEFAULT_MODEL = env.OPENROUTER_MODEL || "openai/gpt-4o"; // Can use: anthropic/claude-3.5-sonnet, openai/gpt-4o, etc.
const DEFAULT_VISION_MODEL = env.OPENROUTER_VISION_MODEL || "openai/gpt-4o"; // For vision tasks

/**
 * Debug logging for AI service
 */
const debugLog = (message: string, data?: any) => {
  logger.debug(`🤖 AI Service: ${message}`, data ? data : "");
};

/**
 * OpenRouter API Request Interface
 */
interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content:
      | string
      | Array<{
          type: "text" | "image_url";
          text?: string;
          image_url?: {
            url: string;
            detail?: "low" | "high" | "auto";
          };
        }>;
  }>;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: "json_object" | "text" };
  stream?: boolean;
}

/**
 * OpenRouter API Response Interface
 */
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Make OpenRouter API call
 */
const callOpenRouter = async (
  request: OpenRouterRequest
): Promise<OpenRouterResponse> => {
  try {
    debugLog("Making OpenRouter API call", {
      model: request.model,
      messagesCount: request.messages.length,
      maxTokens: request.max_tokens,
    });

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:8080", // Required by OpenRouter
        "X-Title": "Grievance Aid System", // Optional: App name
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `OpenRouter API error: ${response.status} ${response.statusText}`;
      let fullErrorData: any = null;
      try {
        fullErrorData = await response.json();
        errorMessage =
          fullErrorData.error?.message || fullErrorData.message || errorMessage;

        // Log detailed error information
        logger.error("OpenRouter API detailed error:", {
          status: response.status,
          statusText: response.statusText,
          errorData: fullErrorData,
          model: request.model,
          hasImages: request.messages.some(
            (m: any) =>
              Array.isArray(m.content) &&
              m.content.some((c: any) => c.type === "image_url")
          ),
        });
      } catch (parseError) {
        // If JSON parsing fails, use default error message
        logger.error("Failed to parse OpenRouter error response:", parseError);
      }
      debugLog("OpenRouter API error", {
        status: response.status,
        error: errorMessage,
        fullError: fullErrorData,
      });
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as OpenRouterResponse;
    debugLog("OpenRouter API success", {
      model: data.model,
      usage: data.usage,
      choicesCount: data.choices.length,
    });

    return data;
  } catch (error) {
    logger.error("OpenRouter API call failed:", error);
    throw error;
  }
};

/**
 * Text-only LLM call (for analysis, generation, etc.)
 */
export const callLLM = async (
  prompt: string,
  systemPrompt?: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: "json" | "text";
  }
): Promise<string> => {
  const model = options?.model || DEFAULT_MODEL;
  const messages: OpenRouterRequest["messages"] = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const request: OpenRouterRequest = {
    model,
    messages,
    max_tokens: options?.maxTokens || 4000,
    temperature: options?.temperature ?? 0.3,
    ...(options?.responseFormat === "json" && {
      response_format: { type: "json_object" },
    }),
  };

  const response = await callOpenRouter(request);
  return response.choices[0]?.message?.content || "";
};

/**
 * Vision LLM call (for image/document processing)
 */
export const callVisionLLM = async (
  imageDataUrl: string,
  prompt: string,
  systemPrompt?: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    detail?: "low" | "high" | "auto";
  }
): Promise<string> => {
  const primaryModel = options?.model || DEFAULT_VISION_MODEL;
  const fallbackModels = [
    "openai/gpt-4o",
    "openai/gpt-4-vision-preview",
    "google/gemini-pro-vision",
    "anthropic/claude-3-opus",
  ].filter((m) => m !== primaryModel);

  const messages: OpenRouterRequest["messages"] = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: [
      {
        type: "text",
        text: prompt,
      },
      {
        type: "image_url",
        image_url: {
          url: imageDataUrl,
          detail: options?.detail || "high",
        },
      },
    ],
  });

  const request: OpenRouterRequest = {
    model: primaryModel,
    messages,
    max_tokens: options?.maxTokens || 4000,
    temperature: options?.temperature ?? 0.1,
  };

  // Try primary model first
  try {
    const response = await callOpenRouter(request);
    return response.choices[0]?.message?.content || "";
  } catch (error: any) {
    logger.warn(
      `Primary vision model ${primaryModel} failed: ${error.message}`
    );

    // Try fallback models
    for (const fallbackModel of fallbackModels) {
      try {
        logger.info(`Attempting fallback vision model: ${fallbackModel}`);
        request.model = fallbackModel;
        const response = await callOpenRouter(request);
        logger.info(`Fallback model ${fallbackModel} succeeded`);
        return response.choices[0]?.message?.content || "";
      } catch (fallbackError: any) {
        logger.warn(
          `Fallback vision model ${fallbackModel} also failed: ${fallbackError.message}`
        );
      }
    }

    // If all models fail, throw the original error
    throw new Error(
      `All vision models failed. Last error: ${error.message}. Please check OpenRouter API key and model availability.`
    );
  }
};

/**
 * Batch vision call (multiple images)
 */
export const callVisionLLMBatch = async (
  imageDataUrls: string[],
  prompt: string,
  systemPrompt?: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    detail?: "low" | "high" | "auto";
  }
): Promise<string> => {
  const primaryModel = options?.model || DEFAULT_VISION_MODEL;
  const fallbackModels = [
    "openai/gpt-4o",
    "openai/gpt-4-vision-preview",
    "google/gemini-pro-vision",
    "anthropic/claude-3-opus",
  ].filter((m) => m !== primaryModel);

  const messages: OpenRouterRequest["messages"] = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  const content: any[] = [
    {
      type: "text",
      text: prompt,
    },
  ];

  // Add all images
  imageDataUrls.forEach((imageUrl) => {
    content.push({
      type: "image_url",
      image_url: {
        url: imageUrl,
        detail: options?.detail || "high",
      },
    });
  });

  messages.push({
    role: "user",
    content,
  });

  const request: OpenRouterRequest = {
    model: primaryModel,
    messages,
    max_tokens: options?.maxTokens || 6000,
    temperature: options?.temperature ?? 0.1,
  };

  // Try primary model first
  try {
    const response = await callOpenRouter(request);
    return response.choices[0]?.message?.content || "";
  } catch (error: any) {
    logger.warn(
      `Primary vision model ${primaryModel} failed for batch: ${error.message}`
    );

    // Try fallback models
    for (const fallbackModel of fallbackModels) {
      try {
        logger.info(
          `Attempting fallback vision model for batch: ${fallbackModel}`
        );
        request.model = fallbackModel;
        const response = await callOpenRouter(request);
        logger.info(`Fallback model ${fallbackModel} succeeded for batch`);
        return response.choices[0]?.message?.content || "";
      } catch (fallbackError: any) {
        logger.warn(
          `Fallback vision model ${fallbackModel} also failed for batch: ${fallbackError.message}`
        );
      }
    }

    // If all models fail, throw the original error
    throw new Error(
      `All vision models failed for batch processing. Last error: ${error.message}. Please check OpenRouter API key and model availability.`
    );
  }
};

/**
 * Generate AI Analysis for Complaint
 */
export interface AIAnalysisResponse {
  analysis: string;
  severity_score: number;
  estimated_cost: number;
  estimated_timeline_days: number;
  risks: string[];
  alternatives: string[];
  success_metrics: string[];
  resource_requirements: string[];
  resolution_steps: Array<{
    step_number: number;
    title: string;
    description: string;
    estimated_cost?: number;
    estimated_days?: number;
    department?: string;
  }>;
}

export const generateAIAnalysis = async (
  title: string,
  description: string,
  category: string,
  location: string,
  priority: string
): Promise<AIAnalysisResponse> => {
  const systemPrompt = `You are an expert government complaint resolution analyst. Analyze complaints and provide structured resolution plans.`;

  const userPrompt = `Analyze this complaint and provide a comprehensive resolution plan:

Title: ${title}
Description: ${description}
Category: ${category}
Location: ${location}
Priority: ${priority}

Provide your response in JSON format:
{
  "analysis": "Detailed analysis of the complaint...",
  "severity_score": 8,
  "estimated_cost": 45000,
  "estimated_timeline_days": 5,
  "risks": ["Risk 1", "Risk 2"],
  "alternatives": ["Alternative 1", "Alternative 2"],
  "success_metrics": ["Metric 1", "Metric 2"],
  "resource_requirements": ["Resource 1", "Resource 2"],
  "resolution_steps": [
    {
      "step_number": 1,
      "title": "Step Title",
      "description": "Step description",
      "estimated_cost": 1000,
      "estimated_days": 1,
      "department": "Department Name"
    }
  ]
}`;

  const response = await callLLM(userPrompt, systemPrompt, {
    responseFormat: "json",
    maxTokens: 4000,
    temperature: 0.3,
  });

  try {
    // Parse JSON response (handle markdown code blocks)
    let jsonContent = response.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonContent);
    return parsed as AIAnalysisResponse;
  } catch (error) {
    logger.error("Failed to parse AI analysis response:", error);
    throw new Error("Invalid AI response format");
  }
};

/**
 * Process document image for text extraction
 */
export const processDocumentImage = async (
  imageDataUrl: string
): Promise<{
  extractedText: string;
  formSuggestions: Array<{
    field: string;
    value: string;
    confidence: number;
  }>;
}> => {
  const systemPrompt = `You are an expert document scanner. Extract all text from images and identify form fields.`;

  const userPrompt = `Analyze this document image and:

1. Extract ALL text visible in the image
2. Identify form fields for a complaint form:
   - name: Person's full name
   - phone: Phone/mobile number
   - email: Email address
   - location: Address or location
   - description: Main complaint or issue description
   - category: Type of issue

Respond in JSON format:
{
  "extractedText": "All text found in the image...",
  "formSuggestions": [
    {"field": "name", "value": "extracted name", "confidence": 0.9}
  ]
}`;

  const response = await callVisionLLM(imageDataUrl, userPrompt, systemPrompt, {
    maxTokens: 2000,
    temperature: 0.1,
    detail: "high",
  });

  try {
    let jsonContent = response.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonContent);
    return {
      extractedText: parsed.extractedText || "",
      formSuggestions: parsed.formSuggestions || [],
    };
  } catch (error) {
    // If JSON parsing fails, return as plain text
    return {
      extractedText: response,
      formSuggestions: [],
    };
  }
};

/**
 * Process multiple document images in batch for text extraction
 * Processes all images together in a single AI call
 */
export const processDocumentsBatch = async (
  imageDataUrls: string[]
): Promise<{
  extractedText: string;
  formSuggestions: Array<{
    field: string;
    value: string;
    confidence: number;
  }>;
}> => {
  if (!imageDataUrls || imageDataUrls.length === 0) {
    throw new Error("At least one image is required");
  }

  // Validate image URLs are base64 data URLs
  for (const url of imageDataUrls) {
    if (
      !url.startsWith("data:image/") &&
      !url.startsWith("data:application/pdf")
    ) {
      logger.warn(`Invalid image data URL format: ${url.substring(0, 50)}...`);
    }
  }

  const content = `You are an expert AI assistant specializing in Uttar Pradesh government complaint document processing. You will analyze ${imageDataUrls.length} document image(s) that may contain text in Hindi, English, or mixed languages, and may be handwritten or typed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1: DOCUMENT IDENTIFICATION & CONTEXT BUILDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

First, identify each document type:
- PRIMARY COMPLAINT: The main complaint letter/application
- SUPPORTING EVIDENCE: Photos of issues (roads, facilities, etc.)
- REFERENCE DOCUMENTS: Police complaints, FIRs, previous correspondence
- IDENTITY PROOF: Aadhaar, voter ID, ration card
- OFFICIAL DOCUMENTS: Bills, certificates, medical reports, land records

Then establish relationships:
- Which documents support the complaint?
- Which documents provide complainant identity?
- Are there references between documents (e.g., FIR number mentioned in complaint)?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2: TEXT EXTRACTION (MULTILINGUAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EACH image, extract ALL text carefully:
- Identify language: Hindi (हिन्दी), English, or mixed
- For Devanagari script: Pay special attention to matras (vowel marks), conjuncts, and similar-looking characters
- For handwritten text: Focus on context and word patterns, not just individual letters
- Preserve original text exactly as written (don't translate yet)
- Determine DOMINANT LANGUAGE: The primary language used in the complaint letter (by word count/content volume)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3: EXTRACT COMPLAINANT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL: Distinguish between:
1. COMPLAINANT (शिकायतकर्ता): The person SUBMITTING the complaint
   - Look for: "निवेदक", "प्रार्थी", "Applicant", signature sections, "From:", letter writers

2. SUBJECT OF COMPLAINT: The person/entity being complained ABOUT
   - Look for: "विरुद्ध", "against", accused parties, departments mentioned

Extract ONLY complainant details:
- name: Full name of complaint writer (प्रार्थी/निवेदक का नाम)
- phone: Complainant's mobile/phone number
- email: Complainant's email (if present)
- location: Complainant's full address/area (not the problem location)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4: COMPLAINT CATEGORIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyze the complaint content and assign ONE primary category:

INFRASTRUCTURE:
  - "roads" - potholes, damaged roads, construction issues
  - "electricity" - power cuts, faulty lines, transformer issues
  - "water" - supply interruption, contamination, pipeline damage

SERVICES:
  - "health" - hospital issues, medical facilities, ambulance
  - "documents" - Aadhaar, certificates, ration card, land records
  - "education" - school issues, fees, admissions, scholarships

OTHER:
  - "other" - general requests, other issues not covered above

Keywords to help identify (Hindi/English):
- Roads: रस्ता, सड़क, रोड, गड्ढे, road, pothole
- Water: पानी, जलापूर्ति, water supply, नल
- Electricity: बिजली, विद्युत, पॉवर कट, electricity, light
- Health: स्वास्थ्य, अस्पताल, दवाखाना, hospital, medical

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5: GENERATE COMPREHENSIVE DESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CRITICAL: Write the ENTIRE description in the DOMINANT LANGUAGE detected in Phase 2.**
- If complaint is primarily in Hindi → Write description entirely in Hindi
- If complaint is primarily in English → Write description entirely in English
- DO NOT mix languages in the description - use ONLY the dominant language throughout

Create a rich, detailed description that includes:

1. CORE ISSUE: What is the main problem? (2-3 sentences)

2. KEY DETAILS FROM COMPLAINT:
   - Specific location/area affected
   - Duration of problem (how long it's been happening)
   - Impact on complainant/community
   - Any reference numbers (FIR, previous complaint, bill numbers)

3. SUPPORTING EVIDENCE (if present):
   - "Supporting documents include: [list document types]" (in dominant language)
   - "Referenced evidence: [mention FIR numbers, bills, photos]" (in dominant language)

4. COMPLAINANT'S ARGUMENTS (verbatim key phrases):
   - Include 2-3 important original phrases from the complaint

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT (JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "combinedSuggestions": {
    "fields": [
      {"field": "name", "value": "राजेश कुमार शर्मा", "confidence": 0.9},
      {"field": "phone", "value": "9876543210", "confidence": 0.95},
      {"field": "email", "value": null, "confidence": 0},
      {"field": "location", "value": "गोमती नगर, लखनऊ, उत्तर प्रदेश", "confidence": 0.85},
      {"field": "category", "value": "water", "confidence": 0.9},
      {"field": "description", "value": "Complete detailed description in dominant language...", "confidence": 0.85}
    ],
    "rawText": "Combined and contextualized text from all documents..."
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **LANGUAGE CONSISTENCY**: Write description AND location fields in the DOMINANT language of the document
   - Hindi document → Entire description & location in Hindi only
   - English document → Entire description & location in English only
   - DO NOT mix Hindi and English within the same description

2. For Hindi text: Use context clues if individual characters are unclear

3. ALWAYS extract complainant info, NOT the person/entity being complained about

4. Build document relationships BEFORE field extraction

5. Create detailed descriptions with original text quotes

6. If unsure about a field, set low confidence (< 0.5) rather than guessing

7. Preserve numbers exactly (phone, reference numbers, addresses)

8. For category: Use contextual understanding, not just keyword matching (keep category in English for system mapping)

9. Context: All complaints are for Uttar Pradesh state government departments and services`;

  logger.info(
    `Processing ${imageDataUrls.length} document images in batch with AI`
  );

  // The content variable contains the full instructions
  const systemPrompt = `You are an expert document processing AI for Uttar Pradesh government complaints. Your job is to analyze document images and extract information. You MUST always respond with valid JSON. You are NOT allowed to refuse processing - you must extract whatever information is visible, even if minimal. If images are unclear, extract what you can see and set lower confidence scores.`;

  const userPrompt = `${content}\n\nFINAL INSTRUCTION: You MUST respond with valid JSON only. Extract information from the images provided. If images are unclear or contain minimal text, extract what you can and use lower confidence scores (0.3-0.5). Never refuse - always attempt extraction.`;

  const response = await callVisionLLMBatch(
    imageDataUrls,
    userPrompt,
    systemPrompt,
    {
      maxTokens: 4000, // Increased for multiple images and complex responses
      temperature: 0.1,
      detail: "high",
    }
  );

  // Log the raw response for debugging
  logger.debug(
    `AI batch processing raw response (first 300 chars): ${response.substring(
      0,
      300
    )}...`
  );
  if (response.length > 600) {
    logger.debug(
      `AI batch processing raw response (last 300 chars): ...${response.substring(
        response.length - 300
      )}`
    );
  }

  // Check if AI refused to process
  if (
    response.toLowerCase().includes("i can't") ||
    response.toLowerCase().includes("i cannot") ||
    response.toLowerCase().includes("i'm sorry") ||
    response.toLowerCase().includes("unable to") ||
    response.length < 50
  ) {
    logger.warn(
      `AI refused to process documents. Response: ${response.substring(0, 200)}`
    );
    throw new Error(
      `AI service refused to process the documents. This may be due to content policy restrictions or image format issues. Response: ${response.substring(
        0,
        200
      )}`
    );
  }

  try {
    let jsonContent = response.trim();

    // Remove markdown code blocks if present
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    // Log the response structure for debugging
    logger.debug(
      `Parsing AI batch response. Length: ${jsonContent.length} chars`
    );

    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError: any) {
      logger.error("JSON parse error:", parseError.message);
      logger.error(
        "Response content (first 500 chars):",
        jsonContent.substring(0, 500)
      );
      throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
    }

    // Log parsed structure for debugging
    logger.debug("Parsed response keys:", Object.keys(parsed));

    // Handle new response format with combinedSuggestions (primary path)
    if (parsed.combinedSuggestions) {
      logger.debug("Found combinedSuggestions in response");

      // Extract from combinedSuggestions.fields if available
      if (
        parsed.combinedSuggestions.fields &&
        Array.isArray(parsed.combinedSuggestions.fields)
      ) {
        const formSuggestions = parsed.combinedSuggestions.fields
          .filter(
            (field: any) =>
              field &&
              field.field &&
              field.value !== null &&
              field.value !== undefined &&
              field.value !== "" &&
              String(field.value).trim() !== ""
          )
          .map((field: any) => ({
            field: String(field.field),
            value: String(field.value),
            confidence:
              typeof field.confidence === "number" ? field.confidence : 0.8,
          }));

        logger.info(
          `Extracted ${formSuggestions.length} form suggestions from combinedSuggestions`
        );

        const extractedText =
          parsed.combinedSuggestions.rawText ||
          parsed.combinedSuggestions.extractedText ||
          parsed.extractedText ||
          "";

        if (formSuggestions.length > 0 || extractedText) {
          return {
            extractedText,
            formSuggestions,
          };
        }
        // If combinedSuggestions exists but no valid data, continue to fallback
        logger.warn(
          "combinedSuggestions found but no valid fields extracted, trying fallback"
        );
      } else {
        logger.warn(
          "combinedSuggestions found but fields array is missing or invalid"
        );
      }
    }

    // Fallback: Extract from individualResults if combinedSuggestions is missing
    if (
      parsed.individualResults &&
      Array.isArray(parsed.individualResults) &&
      parsed.individualResults.length > 0
    ) {
      logger.debug("Extracting from individualResults as fallback");

      const allSuggestions: any[] = [];
      let allText = "";

      // Collect suggestions from all individual results
      parsed.individualResults.forEach((result: any) => {
        if (result.extractedText) {
          allText += (allText ? "\n\n" : "") + result.extractedText;
        }
        if (result.formSuggestions && Array.isArray(result.formSuggestions)) {
          allSuggestions.push(...result.formSuggestions);
        }
      });

      // Deduplicate and merge suggestions by field (keep highest confidence)
      const fieldMap = new Map<string, any>();
      allSuggestions.forEach((suggestion: any) => {
        const existing = fieldMap.get(suggestion.field);
        if (
          !existing ||
          (suggestion.confidence || 0) > (existing.confidence || 0)
        ) {
          if (
            suggestion.value !== null &&
            suggestion.value !== undefined &&
            String(suggestion.value).trim() !== ""
          ) {
            fieldMap.set(suggestion.field, {
              field: suggestion.field,
              value: String(suggestion.value),
              confidence: suggestion.confidence || 0.8,
            });
          }
        }
      });

      const formSuggestions = Array.from(fieldMap.values());
      logger.info(
        `Extracted ${formSuggestions.length} form suggestions from ${parsed.individualResults.length} individual results`
      );

      return {
        extractedText: allText || parsed.extractedText || "",
        formSuggestions,
      };
    }

    // Handle legacy format
    if (parsed.formSuggestions && Array.isArray(parsed.formSuggestions)) {
      logger.debug("Using legacy formSuggestions format");
      const formSuggestions = parsed.formSuggestions
        .filter(
          (field: any) =>
            field.value !== null &&
            field.value !== undefined &&
            field.value !== "" &&
            String(field.value).trim() !== ""
        )
        .map((field: any) => ({
          field: field.field,
          value: String(field.value),
          confidence: field.confidence || 0.8,
        }));

      return {
        extractedText: parsed.extractedText || parsed.rawText || "",
        formSuggestions,
      };
    }

    // Final fallback - log warning and return empty
    logger.warn(
      "No recognizable format found in AI response. Available keys:",
      Object.keys(parsed)
    );
    return {
      extractedText:
        parsed.extractedText ||
        parsed.rawText ||
        JSON.stringify(parsed, null, 2),
      formSuggestions: [],
    };
  } catch (error: any) {
    logger.error("Failed to parse AI batch response:", error);
    logger.error("Error message:", error.message);
    // Return as plain text if parsing fails completely
    return {
      extractedText: response,
      formSuggestions: [],
    };
  }
};

/**
 * Research related issues for a complaint
 */
export interface ResearchResponse {
  similar_issues: Array<{
    title: string;
    source: string;
    date?: string;
    summary: string;
  }>;
  budget_info: {
    department: string;
    allocation?: string;
    source?: string;
    summary: string;
  };
  news_articles: Array<{
    title: string;
    source: string;
    url?: string;
    summary: string;
  }>;
  key_facts: string[];
  research_depth: "basic" | "detailed" | "comprehensive";
}

export const researchRelatedIssues = async (
  title: string,
  category: string,
  location: string,
  depth: "basic" | "detailed" | "comprehensive" = "detailed"
): Promise<ResearchResponse> => {
  const systemPrompt = `You are a research analyst specializing in civic issues in India. Provide research information in Marathi when possible.`;

  const userPrompt = `For a complaint titled "${title}" (category: ${category}) located at "${location}", provide research information:

1. Similar past complaints in the area
2. Municipal budget allocations for the ${category} department
3. Recent news articles related to this issue
4. Key facts that should be highlighted in the complaint letter

Format as JSON:
{
  "similar_issues": [{"title": "...", "source": "...", "date": "...", "summary": "..."}],
  "budget_info": {"department": "...", "allocation": "...", "source": "...", "summary": "..."},
  "news_articles": [{"title": "...", "source": "...", "url": "...", "summary": "..."}],
  "key_facts": ["Fact 1", "Fact 2"],
  "research_depth": "${depth}"
}`;

  const response = await callLLM(userPrompt, systemPrompt, {
    responseFormat: "json",
    maxTokens: 4000,
    temperature: 0.3,
  });

  try {
    let jsonContent = response.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    }
    return JSON.parse(jsonContent) as ResearchResponse;
  } catch (error) {
    logger.error("Failed to parse research response:", error);
    throw new Error("Invalid research response format");
  }
};

/**
 * Find complaint officers
 */
export interface ComplaintOfficer {
  name?: string;
  designation: string;
  office_address: string;
  phone: string;
  email: string;
}

export interface ComplaintOfficersResponse {
  primary_officer: ComplaintOfficer;
  secondary_officer: ComplaintOfficer;
}

export const findComplaintOfficers = async (
  title: string,
  description: string,
  location: string
): Promise<ComplaintOfficersResponse> => {
  const systemPrompt = `You are an expert civic-services assistant for Uttar Pradesh, India. Identify appropriate government officials for complaints with Hindi names and proper titles.`;

  const userPrompt = `A resident at "${location}" (Uttar Pradesh) needs to lodge a complaint titled "${title}". Details: "${description}".

Identify the primary and secondary officials to whom the letter should be sent. Use Hindi names (e.g., श्री/श्रीमती [Name]) and proper official titles in Hindi where appropriate.

For Uttar Pradesh, common officials include:
- जिलाधिकारी (District Magistrate/Collector) - for administrative issues
- पुलिस अधीक्षक (Superintendent of Police) - for law & order
- मुख्य चिकित्सा अधिकारी (Chief Medical Officer) - for health issues
- कार्यकारी अभियंता (Executive Engineer) - for PWD, Jal Nigam, electricity
- मुख्य विकास अधिकारी (Chief Development Officer) - for rural development

Provide realistic contact details for the specified location in UP.

Format as JSON:
{
  "primary_officer": {
    "name": "श्री/श्रीमती [Full Name]",
    "designation": "[Designation in Hindi/English]",
    "office_address": "[Complete address with district and pincode]",
    "phone": "[Office phone number]",
    "email": "[Official email]"
  },
  "secondary_officer": {
    "name": "श्री/श्रीमती [Full Name]",
    "designation": "[Designation in Hindi/English]",
    "office_address": "[Complete address with district and pincode]",
    "phone": "[Office phone number]",
    "email": "[Official email]"
  }
}`;

  const response = await callLLM(userPrompt, systemPrompt, {
    responseFormat: "json",
    maxTokens: 2000,
    temperature: 0.2,
  });

  try {
    let jsonContent = response.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    }
    return JSON.parse(jsonContent) as ComplaintOfficersResponse;
  } catch (error) {
    logger.error("Failed to parse officers response:", error);
    throw new Error("Invalid officers response format");
  }
};

/**
 * Draft complaint letter
 */
export interface ComplaintLetter {
  from: string;
  to: string;
  date: string;
  subject: string;
  body: string;
  attachments?: string[];
}

export interface ComplaintLetterResponse {
  letter: ComplaintLetter;
}

export const draftComplaintLetter = async (
  title: string,
  description: string,
  location: string,
  category: string,
  contactName: string,
  primaryOfficer?: ComplaintOfficer,
  researchData?: any
): Promise<ComplaintLetterResponse> => {
  // Format complaint details
  const complaintDetails = {
    submittedBy: contactName || "नागरिक",
    location: location || "उत्तर प्रदेश",
    title: title || "",
    description: description || "",
    category: category || "",
  };

  // Format officer contact data
  let contactData = "";
  if (primaryOfficer) {
    contactData = `Officer Name: ${primaryOfficer.name || "श्री/श्रीमती [Name]"}
Designation: ${primaryOfficer.designation}
Office Address: ${primaryOfficer.office_address}
Email: ${primaryOfficer.email || "N/A"}
Phone: ${primaryOfficer.phone || "N/A"}`;
  } else {
    contactData = "Officer information not available";
  }

  // Format complaint data
  const complaintData = `Complaint Title: ${complaintDetails.title}
Complaint Description: ${complaintDetails.description}
Category: ${complaintDetails.category}
Location: ${complaintDetails.location}
Submitted By: ${complaintDetails.submittedBy}`;

  // Add research data if available
  let researchContext = "";
  if (researchData) {
    researchContext = `\n\nADDITIONAL RESEARCH CONTEXT:\n${JSON.stringify(
      researchData,
      null,
      2
    )}`;
  }

  const MLCNAME = "वागीश पाठक";

  const prompt = `You are a professional letter-writer specialized in Hindi official correspondence for legislative office communications in Uttar Pradesh, India.

CONTEXT: This letter is being written FROM a Member of Legislative Council (MLC) office in Badaun constituency, Uttar Pradesh. The MLC has received a complaint from a constituent (${
    complaintDetails.submittedBy
  }) from ${
    complaintDetails.location
  } and is now writing to the appropriate government officer to address this issue and advocate on behalf of the constituent.

RECIPIENT CONTACT DATA:
${contactData}

COMPLAINT DETAILS FROM CONSTITUENT:
${complaintData}${researchContext}

TASK: Draft a formal Hindi letter from the MLC to the government officer. The letter should clearly state that this complaint was received from a constituent, describe the specific issues faced by the complainant with supporting details, explain the impact/hardship caused, and request appropriate remedial action.

REFERENCE EXAMPLES (Study the structure, tone, and format - these are authentic templates):

पत्र १

सेवा में,
श्री दिनेश कुमार, IAS
जिलाधिकारी / कलेक्टर
बदायूँ

विषय : सामुदायिक स्वास्थ्य केंद्र में चिकित्सा सुविधाओं के सुधार एवं आवश्यक उपकरणों की उपलब्धता सुनिश्चित करने के संबंध में।

महोदय,

मैं जिस बदायूँ निर्वाचन क्षेत्र का प्रतिनिधित्व करता हूं, वहां स्थित सामुदायिक स्वास्थ्य केंद्र में मूलभूत चिकित्सा सुविधाओं का घोर अभाव है। मुझे अपने क्षेत्र के निवासियों से अनेक शिकायतें प्राप्त हुई हैं कि स्वास्थ्य केंद्र में आवश्यक दवाइयां, उपकरण एवं पर्याप्त चिकित्सा कर्मचारी उपलब्ध नहीं हैं।

ग्रामीण क्षेत्रों के नागरिकों को आपातकालीन स्थिति में उचित चिकित्सा सेवाएं नहीं मिल पा रही हैं। गर्भवती महिलाओं, बच्चों एवं वृद्धजनों को विशेष कठिनाई का सामना करना पड़ रहा है। स्वास्थ्य केंद्र में एक्स-रे मशीन, प्रयोगशाला सुविधाएं एवं एम्बुलेंस सेवा की भी कमी है। इस कारण मरीजों को दूर के अस्पतालों में जाना पड़ता है, जिससे उनका समय एवं धन दोनों बर्बाद होता है।

उपरोक्त स्थिति को देखते हुए, सामुदायिक स्वास्थ्य केंद्र में आवश्यक चिकित्सा उपकरण, दवाइयां एवं पर्याप्त स्टाफ की तत्काल व्यवस्था सुनिश्चित की जाए तथा स्वास्थ्य सेवाओं में सुधार लाया जाए, यह विनम्र निवेदन है।

भवदीय,
वागीश पाठक,
विधान परिषद सदस्य
उत्तर प्रदेश




पत्र २

सेवा में,
श्री दिनेश कुमार, IAS
जिलाधिकारी / कलेक्टर
बदायूँ

विषय : ग्रामीण सड़कों की मरम्मत एवं रखरखाव हेतु तत्काल कार्यवाही किए जाने के संबंध में।

महोदय,

मैं जिस बदायूँ निर्वाचन क्षेत्र का प्रतिनिधित्व करता हूं, वहां की ग्रामीण सड़कों की स्थिति अत्यंत दयनीय हो गई है। मुझे अपने क्षेत्र के कई गांवों से शिकायतें मिली हैं कि सड़कें टूटी-फूटी हैं, जगह-जगह गड्ढे हैं और वर्षा ऋतु में स्थिति और भी विकट हो जाती है।

इन सड़कों की खराब दशा के कारण ग्रामीणों को परिवहन में भारी कठिनाई होती है। छात्र-छात्राएं विद्यालय नहीं पहुंच पाते, किसानों को अपनी उपज मंडी तक ले जाने में समस्या आती है, और आपातकालीन स्थिति में एम्बुलेंस भी गांवों तक नहीं पहुंच पाती। इससे ग्रामीण विकास में बाधा उत्पन्न हो रही है तथा आम जनता को असुविधा का सामना करना पड़ रहा है।

उपरोक्त परिस्थिति को ध्यान में रखते हुए, बदायूँ जिले की ग्रामीण सड़कों की तत्काल मरम्मत एवं रखरखाव का कार्य शीघ्रातिशीघ्र प्रारंभ किया जाए तथा भविष्य में नियमित रखरखाव की व्यवस्था सुनिश्चित की जाए, यह विनम्र निवेदन है।

धन्यवाद!

भवदीय,
(MLC Name)
विधान परिषद सदस्य
उत्तर प्रदेश

LETTER STRUCTURE REQUIREMENTS:
1. Opening: "सेवा में," on first line, then "श्री/श्रीमती [Officer Name], [IAS/IPS if applicable]" on second line, then designation on third line, then "[City/District Name]" on fourth line. Do NOT include full address, pincode, email, or phone numbers - keep it simple and clean
2. Subject line starting with "विषय :" or "विषय :-" describing the complaint matter, ending with "के संबंध में।" or "के बारे में।"
3. Salutation: "महोदय," or "महोदया," on its own line (use महोदय for male officers, महोदया for female officers)
4. Body: Start with "मैं जिस बदायूँ निर्वाचन क्षेत्र का प्रतिनिधित्व करता हूं..." to establish MLC's constituency connection, then immediately mention that this complaint was received from a constituent. Clearly state this is constituent advocacy.
5. Detailed description in 2-4 paragraphs: 
   - Mention the complaint was received from constituent (${
     complaintDetails.submittedBy
   }) from ${complaintDetails.location}
   - Describe the specific problem faced by the constituent
   - Provide concrete details from the complaint data (paraphrase English text into formal Hindi, never quote verbatim)
   - Explain the impact, hardship, or consequences faced by the constituent
   - Support the constituent's concern with legislative backing
6. Clear call to action: Start with "उपरोक्त..." or "अतः..." and end with "यह विनम्र निवेदन है।" stating desired resolution
7. Optional: "धन्यवाद!" can be added before closing signature if appropriate
8. Closing: "भवदीय," on one line, then "(MLC Name)" on next line, then "विधान परिषद सदस्य" on next line, then "उत्तर प्रदेश" on final line

LANGUAGE & TONE GUIDELINES:
- Write entirely in formal Hindi (Devanagari script)
- Use formal administrative Hindi vocabulary (शासकीय पत्राचार की भाषा)
- Maintain respectful but assertive tone - MLC advocating for constituent
- Use masculine grammatical forms (MLC is male): "मैं प्रतिनिधित्व करता हूं" (not करती हूं)
- Be specific about the issue - mention constituent's concerns clearly
- Show empathy toward constituent while maintaining official decorum
- Request action on behalf of constituent

RESPONSE FORMAT - You MUST respond with a valid JSON object:
{
  "letter": {
    "from": "विधान परिषद सदस्य, बदायूँ, उत्तर प्रदेश",
    "to": "सेवा में,\\nश्री/श्रीमती [Officer Name], [IAS/IPS if applicable]\\n[Designation]\\n[City/District Name]", 
    "date": "${new Date().toISOString().split("T")[0]}",
    "subject": "विषय : [Complaint subject in Hindi ending with के संबंध में।]",
    "body": "[Complete letter body in Hindi following the structure above - paraphrase all English complaint text into formal Hindi]",
    "attachments": []
  }
}
  
CRITICAL NOTES:
- DEFAULT LANGUAGE: Hindi (Devanagari script) for Uttar Pradesh
- The "to" field should be simple: officer name, designation, and city/district name ONLY - no full addresses, pincodes, emails, or phone numbers
- Letter is FROM the MLC (विधान परिषद सदस्य) NOT from the citizen
- Constituency: बदायूँ निर्वाचन क्षेत्र (Badaun constituency)
- State: उत्तर प्रदेश (Uttar Pradesh)
- Use MASCULINE forms: "मैं प्रतिनिधित्व करता हूं", "प्राप्त हुई है" (when referring to the complaint)
- Clearly establish this is constituent advocacy - mention the complaint was received from constituent (${
    complaintDetails.submittedBy
  })
- Focus on the SPECIFIC issues from complaint data - this is NOT a general request
- The signature MUST be from MLC ${MLCNAME} only
- Be solution-oriented in the closing paragraph`;

  const response = await callLLM(prompt, "", {
    responseFormat: "json",
    maxTokens: 4000,
    temperature: 0.3,
  });

  try {
    let jsonContent = response.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    }
    return JSON.parse(jsonContent) as ComplaintLetterResponse;
  } catch (error) {
    logger.error("Failed to parse letter response:", error);
    throw new Error("Invalid letter response format");
  }
};

/**
 * Generate complaint actions
 */
export interface ComplaintAction {
  type: "email" | "phone_call" | "whatsapp_message";
  to: string;
  details: string;
}

export interface ComplaintActionsResponse {
  actions: ComplaintAction[];
}

export const generateComplaintActions = async (
  title: string,
  description: string,
  category: string,
  location: string
): Promise<ComplaintActionsResponse> => {
  const systemPrompt = `You are an expert at generating actionable steps for complaint resolution.`;

  const userPrompt = `Generate recommended actions for resolving this complaint:

Title: ${title}
Description: ${description}
Category: ${category}
Location: ${location}

Provide actionable steps including emails, phone calls, or WhatsApp messages.

Format as JSON:
{
  "actions": [
    {
      "type": "email|phone_call|whatsapp_message",
      "to": "...",
      "details": "..."
    }
  ]
}`;

  const response = await callLLM(userPrompt, systemPrompt, {
    responseFormat: "json",
    maxTokens: 2000,
    temperature: 0.3,
  });

  try {
    let jsonContent = response.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    }
    return JSON.parse(jsonContent) as ComplaintActionsResponse;
  } catch (error) {
    logger.error("Failed to parse actions response:", error);
    throw new Error("Invalid actions response format");
  }
};

/**
 * Generate detailed instructions for a step
 */
export interface DetailedStepInstructions {
  step_id: string;
  complaint_id: string;
  instructions: string;
  created_at: Date;
  updated_at: Date;
}

export const generateStepInstructions = async (
  stepId: string
): Promise<DetailedStepInstructions> => {
  // Check if instructions already exist
  const existing = await AIStepExecutionInstruction.findOne({
    step_id: stepId,
  }).lean();
  if (existing) {
    return {
      step_id: existing.step_id,
      complaint_id: existing.complaint_id,
      instructions: existing.instructions,
      created_at: existing.created_at,
      updated_at: existing.updated_at,
    };
  }

  // Fetch step and complaint details
  const step = await AIResolutionStep.findOne({ id: stepId }).lean();
  if (!step) {
    throw new NotFoundError("AI Resolution Step");
  }

  const complaint = await Complaint.findOne({ id: step.complaint_id }).lean();
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  // Generate instructions using AI
  const systemPrompt = `You are an expert civic-services assistant. Generate detailed step-by-step execution instructions for complaint resolution steps.`;

  const userPrompt = `Generate detailed execution instructions for this resolution step:

Complaint: ${complaint.title}
Category: ${complaint.category}
Step: ${step.title}
Description: ${step.description}
Department: ${step.department || "Not assigned"}
Estimated Cost: ${
    step.estimated_cost
      ? `₹${step.estimated_cost.toLocaleString()}`
      : "Not specified"
  }
Estimated Days: ${step.estimated_days || "Not specified"}

Provide comprehensive, actionable instructions that can be followed to complete this step. Include:
1. Specific actions to take
2. Required resources or materials
3. Contact information if needed
4. Timeline expectations
5. Success criteria
6. Potential challenges and solutions

Format the instructions in clear, numbered steps.`;

  const instructions = await callLLM(userPrompt, systemPrompt, {
    maxTokens: 2000,
    temperature: 0.3,
  });

  // Save instructions
  const instruction = new AIStepExecutionInstruction({
    complaint_id: step.complaint_id,
    step_id: stepId,
    instructions: instructions.trim(),
  });
  await instruction.save();

  logger.info(`Generated step instructions for step: ${stepId}`);

  return {
    step_id: instruction.step_id,
    complaint_id: instruction.complaint_id,
    instructions: instruction.instructions,
    created_at: instruction.created_at,
    updated_at: instruction.updated_at,
  };
};

/**
 * Fetch step instructions
 */
export const fetchStepInstructions = async (
  stepId: string
): Promise<DetailedStepInstructions | null> => {
  const instruction = await AIStepExecutionInstruction.findOne({
    step_id: stepId,
  }).lean();

  if (!instruction) {
    return null;
  }

  return {
    step_id: instruction.step_id,
    complaint_id: instruction.complaint_id,
    instructions: instruction.instructions,
    created_at: instruction.created_at,
    updated_at: instruction.updated_at,
  };
};

export default {
  callLLM,
  callVisionLLM,
  callVisionLLMBatch,
  generateAIAnalysis,
  processDocumentImage,
  processDocumentsBatch,
  researchRelatedIssues,
  findComplaintOfficers,
  draftComplaintLetter,
  generateComplaintActions,
  generateStepInstructions,
  fetchStepInstructions,
};
