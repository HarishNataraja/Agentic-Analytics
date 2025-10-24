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
    
    // Fix: The `GenerationConfig` type from the SDK does not include the `systemInstruction` property.
    // Extend the type to allow `systemInstruction` as per the API usage guidelines.
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

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    if (!ai) throw new Error("GoogleGenAI not initialized");
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio,
        },
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
};

export const editImage = async (prompt: string, base64ImageData: string, mimeType: string): Promise<string> => {
    if (!ai) throw new Error("GoogleGenAI not initialized");
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64ImageData,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
    }
    throw new Error("No image found in response");
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
            systemInstruction: "You are a voice assistant for the Agentic Analytics Platform. Be conversational and helpful. You can answer general questions, but your primary role is to assist users with understanding their data and presentations. You can't perform actions in the app directly, but you can provide guidance.",
        },
    });
};

export const generatePresentation = async (prompt: string): Promise<Presentation> => {
    if (!ai) throw new Error("GoogleGenAI not initialized");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        slides: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    bulletPoints: { 
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const presentationJson = JSON.parse(response.text);

        // Transform the AI response into our Presentation data structure
        const newPresentation: Presentation = {
            id: `pres-${Date.now()}`,
            title: presentationJson.title || "Untitled Presentation",
            slides: (presentationJson.slides || []).map((slideData: any, index: number) => {
                // Alternate transitions for a more dynamic presentation
                const transitionType: SlideTransitionType = index % 2 === 0 ? 'slide-in-right' : 'slide-in-left';
                return {
                    id: `slide-${index}-${Date.now()}`,
                    background: '#FFFFFF',
                    transition: { type: transitionType },
                    objects: [
                        // Add title object
                        {
                            id: `obj-title-${index}-${Date.now()}`,
                            type: 'text',
                            x: 50,
                            y: 50,
                            width: 700,
                            height: 50,
                            animation: { type: 'fade-in' },
                            content: {
                                text: slideData.title || `Slide ${index + 1}`,
                                bold: true,
                                italic: false,
                                underline: false,
                                fontSize: 32,
                                textAlign: 'left'
                            } as TextContent
                        },
                        // Add bullet points as a single text object
                        ...(slideData.bulletPoints && slideData.bulletPoints.length > 0 ? [{
                            id: `obj-body-${index}-${Date.now()}`,
                            type: 'text',
                            x: 50,
                            y: 120,
                            width: 700,
                            height: 300,
                            animation: { type: 'fly-in-up' },
                            content: {
                                text: slideData.bulletPoints.map((pt: string) => `- ${pt}`).join('\n'),
                                bold: false,
                                italic: false,
                                underline: false,
                                fontSize: 18,
                                textAlign: 'left'
                            } as TextContent
                        }] : [])
                    ]
                }
            })
        };
        
        // Add a title slide
        newPresentation.slides.unshift({
            id: `slide-title-${Date.now()}`,
            background: '#FFFFFF',
            transition: { type: 'fade' }, // Use a fade transition for the title slide
            objects: [{
                id: `obj-maintitle-${Date.now()}`,
                type: 'text',
                x: 50,
                y: 150,
                width: 700,
                height: 100,
                animation: { type: 'fade-in' },
                content: {
                    text: newPresentation.title,
                    bold: true,
                    italic: false,
                    underline: false,
                    fontSize: 48,
                    textAlign: 'center'
                } as TextContent
            }]
        })

        return newPresentation;
    } catch (error) {
        console.error("Failed to generate or parse presentation:", error);
        throw new Error("The AI failed to generate a valid presentation structure from the provided topic. Please try again with a more specific prompt.");
    }
}