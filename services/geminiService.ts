// Fix: Import `LiveServerMessage` and `Blob` instead of `LiveSession` and `LiveSessionCallbacks`.
import { GoogleGenAI, GenerateContentResponse, Modality, LiveServerMessage, Type, Blob, GenerationConfig } from "@google/genai";
import { AspectRatio, Presentation, SlideTransitionType, TextContent } from "../types";

let ai: GoogleGenAI;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
    console.error("API_KEY environment variable not set.");
}

// Fix: Define LiveSession and LiveSessionCallbacks as they are not exported from @google/genai
export interface LiveSessionCallbacks {
    onopen?: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}

export interface LiveSession {
    sendRealtimeInput: (input: { media: Blob }) => void;
    close: () => void;
    sendToolResponse: (response: any) => void;
}

export const createBlankPresentation = (): Presentation => ({
    id: `pres-${Date.now()}`,
    title: "Untitled Presentation",
    slides: [{
        id: `slide-${Date.now()}`,
        background: '#FFFFFF',
        transition: { type: 'fade' },
        objects: [{
            id: `obj-title-${Date.now()}`,
            type: 'text',
            x: 50, y: 150, width: 700, height: 100,
            animation: { type: 'fade-in' },
            content: { text: "Click to edit title", bold: true, italic: false, underline: false, fontSize: 48, textAlign: 'center' }
        }]
    }]
});

export const createErrorPresentation = (title: string, errorText: string): Presentation => ({
    id: `pres-error-${Date.now()}`,
    title,
    slides: [{
        id: `slide-error-${Date.now()}`,
        background: '#FFFFFF',
        transition: { type: 'fade' },
        objects: [{
            id: `obj-error-title-${Date.now()}`,
            type: 'text',
            x: 50, y: 150, width: 700, height: 100,
            animation: { type: 'fade-in' },
            content: { text: title, bold: true, italic: false, underline: false, fontSize: 48, textAlign: 'center' }
        }, {
            id: `obj-error-body-${Date.now()}`,
            type: 'text',
            x: 50, y: 250, width: 700, height: 100,
            animation: { type: 'fade-in' },
            content: { text: `Sorry, something went wrong:\n${errorText}\n\nPlease try again with a more specific prompt.`, bold: false, italic: false, underline: false, fontSize: 18, textAlign: 'center' }
        }]
    }]
});

export const generateText = async (prompt: string, isThinkingMode: boolean, systemInstruction?: string): Promise<{ text: string, sources: any[] }> => {
    if (!ai) throw new Error("GoogleGenAI not initialized");
    const model = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const config: GenerationConfig & { systemInstruction?: string } = {};
    if (isThinkingMode) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }
    if (systemInstruction) {
        config.systemInstruction = systemInstruction;
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: prompt,
        config
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.web) ?? [];
    return { text: response.text, sources };
};

export const startLiveSession = async (callbacks: LiveSessionCallbacks): Promise<LiveSession> => {
    if (!ai) throw new Error("GoogleGenAI not initialized");
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: "You are a voice assistant for the Agentic Analytics Platform...",
        },
    });
};

const presentationSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        slides: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    background: { type: Type.STRING },
                    transition: { 
                        type: Type.OBJECT,
                        properties: { type: { type: Type.STRING } }
                    },
                    objects: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                type: { type: Type.STRING },
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER },
                                width: { type: Type.NUMBER },
                                height: { type: Type.NUMBER },
                                animation: {
                                    type: Type.OBJECT,
                                    properties: { type: { type: Type.STRING } }
                                },
                                content: {
                                    type: Type.OBJECT,
                                    properties: {
                                        // Text
                                        text: { type: Type.STRING },
                                        bold: { type: Type.BOOLEAN },
                                        italic: { type: Type.BOOLEAN },
                                        underline: { type: Type.BOOLEAN },
                                        fontSize: { type: Type.NUMBER },
                                        textAlign: { type: Type.STRING },
                                        
                                        // Image
                                        src: { type: Type.STRING },
                
                                        // Shape & Icon
                                        shape: { type: Type.STRING },
                                        color: { type: Type.STRING },
                                        borderColor: { type: Type.STRING },
                                        borderWidth: { type: Type.NUMBER },
                                        borderStyle: { type: Type.STRING },
                                        opacity: { type: Type.NUMBER },
                                        name: { type: Type.STRING },
                
                                        // Chart (simplified)
                                        type: { type: Type.STRING },
                                        data: { 
                                            type: Type.ARRAY, 
                                            items: { 
                                                type: Type.OBJECT, 
                                                properties: {
                                                    name: { type: Type.STRING },
                                                    value: { type: Type.NUMBER },
                                                }
                                            } 
                                        },
                                        dataKey: { type: Type.STRING },
                                        nameKey: { type: Type.STRING },
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

export const editPresentation = async (prompt: string, currentPresentation: Presentation): Promise<Presentation> => {
    if (!ai) throw new Error("GoogleGenAI not initialized");
    const systemInstruction = `You are an AI assistant integrated into a presentation editor. Your task is to modify a presentation based on user commands. The user will provide the current presentation's state as a JSON object and a command in plain text. You must return the *entire*, updated presentation JSON object, conforming strictly to the provided schema. Do not add any conversational text or markdown. Just return the JSON.

**Available actions based on commands:**
- "add a new slide": Add a new slide to the 'slides' array. Give it a unique ID.
- "change the title of slide 2": Find the slide with the matching index and modify its title object.
- "add a text box with 'Hello'": Add a new text object to the current slide's 'objects' array.
- "delete slide 3": Remove the slide at the specified index from the 'slides' array.
- "change the background of the current slide to blue": Modify the 'background' property of the specified slide.

Always preserve existing IDs for objects and slides unless creating a new one. Ensure the output is a single, valid JSON object.`;

    const fullPrompt = `Current Presentation State:
\`\`\`json
${JSON.stringify(currentPresentation)}
\`\`\`

User Command: "${prompt}"

Return the full, updated presentation JSON object now.`

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using pro for better structure adherence
            contents: fullPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: presentationSchema,
            }
        });
        const updatedPresentationJson = JSON.parse(response.text);
        // Basic validation
        if (updatedPresentationJson && Array.isArray(updatedPresentationJson.slides)) {
            return updatedPresentationJson;
        }
        console.warn("AI returned a valid JSON but with a missing or invalid 'slides' array. Returning current state.");
        return createErrorPresentation("AI Response Error", "The AI returned an invalid presentation structure. It might have misunderstood the request.");

    } catch (error) {
        console.error("Failed to generate or parse presentation edit:", error);
        throw new Error(`The AI failed to process the edit command. ${error instanceof Error ? error.message : ''}`);
    }
};