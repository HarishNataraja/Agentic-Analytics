// Fix: Import `LiveServerMessage` and `Blob` instead of `LiveSession` and `LiveSessionCallbacks`.
import { GoogleGenAI, GenerateContentResponse, Modality, LiveServerMessage, Type, Blob, GenerationConfig, FunctionDeclaration, Image } from "@google/genai";
// Fix: Import AIStudio from the central types file.
import { AspectRatio, Presentation, Slide, SlideTransition, TextContent, ObjectAnimation, DashboardItem } from "../types";

// This is a browser-only app, so we can't use process.env.
// The user will be prompted to provide their key for video generation.
// For other features, we assume the key is available via a hypothetical `window.aistudio.getApiKey()`
// The global `window.aistudio` type is now declared in `types.ts` to avoid conflicts.

const getAiClient = (): GoogleGenAI => {
    // In a real scenario, the key might be managed by a library like aistudio
    // For this app, we'll rely on the key being available when needed, especially for Veo.
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
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
        notes: '',
        transition: { preset: 'fade', duration: 500 },
        objects: [{
            id: `obj-title-${Date.now()}`,
            type: 'text',
            x: 50, y: 150, width: 700, height: 100,
            rotation: 0,
            flipX: false,
            flipY: false,
            opacity: 1,
            animation: { preset: 'fade-in', trigger: 'on-load', duration: 500, delay: 0, loop: false },
            exitAnimation: null,
            content: { 
                text: "Click to edit title",
                fontFamily: 'Arial',
                fontSize: 48,
                fontWeight: 'bold',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                color: '#000000',
                backgroundColor: 'transparent',
                letterSpacing: 0,
                lineHeight: 1.2,
                paragraphSpacing: 0,
                textTransform: 'none',
                overflow: 'visible',
                strokeColor: '#000000',
                strokeWidth: 0,
            }
        }]
    }]
});

export const createErrorPresentation = (title: string, errorText: string): Presentation => ({
    id: `pres-error-${Date.now()}`,
    title,
    slides: [{
        id: `slide-error-${Date.now()}`,
        background: '#FFFFFF',
        notes: '',
        transition: { preset: 'fade', duration: 500 },
        objects: [{
            id: `obj-error-title-${Date.now()}`,
            type: 'text',
            x: 50, y: 150, width: 700, height: 100,
            rotation: 0, opacity: 1, flipX: false, flipY: false,
            animation: { preset: 'fade-in', trigger: 'on-load', duration: 500, delay: 0, loop: false },
            exitAnimation: null,
            content: { 
                text: title,
                fontFamily: 'Arial', fontSize: 48, fontWeight: 'bold', fontStyle: 'normal',
                textDecoration: 'none', textAlign: 'center', color: '#000000',
                backgroundColor: 'transparent', letterSpacing: 0, lineHeight: 1.2, paragraphSpacing: 0,
                textTransform: 'none', overflow: 'visible', strokeColor: '#000000', strokeWidth: 0,
             }
        }, {
            id: `obj-error-body-${Date.now()}`,
            type: 'text',
            x: 50, y: 250, width: 700, height: 100,
            rotation: 0, opacity: 1, flipX: false, flipY: false,
            animation: { preset: 'fade-in', trigger: 'on-load', duration: 500, delay: 0, loop: false },
            exitAnimation: null,
            content: { 
                text: `Sorry, something went wrong:\n${errorText}\n\nPlease try again with a more specific prompt.`,
                fontFamily: 'Arial', fontSize: 18, fontWeight: 'normal', fontStyle: 'normal',
                textDecoration: 'none', textAlign: 'center', color: '#000000',
                backgroundColor: 'transparent', letterSpacing: 0, lineHeight: 1.4, paragraphSpacing: 0,
                textTransform: 'none', overflow: 'visible', strokeColor: '#000000', strokeWidth: 0,
            }
        }]
    }]
});

export const generateText = async (prompt: string, isThinkingMode: boolean, systemInstruction?: string): Promise<{ text: string, sources: any[] }> => {
    const ai = getAiClient();
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
    const ai = getAiClient();
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

const animationSchema = {
    type: Type.OBJECT,
    properties: { 
        preset: { type: Type.STRING, enum: ['none', 'fade-in', 'fly-in-up', 'fly-in-left', 'zoom-in', 'bounce-in', 'flip-3d', 'reveal-mask', 'parallax-drift-slow', 'parallax-drift-medium', 'parallax-drift-fast', 'fade-out', 'fly-out-down', 'fly-out-right', 'zoom-out'] },
        trigger: { type: Type.STRING, enum: ['on-load', 'on-click'] },
        duration: { type: Type.NUMBER },
        delay: { type: Type.NUMBER },
        loop: { type: Type.BOOLEAN },
    }
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
                    notes: { type: Type.STRING, description: "Speaker notes for the slide." },
                    transition: { 
                        type: Type.OBJECT,
                        properties: { 
                            preset: { type: Type.STRING, enum: ['none', 'fade', 'slide-in-left', 'slide-in-right', 'cube-rotate', 'card-flip'] },
                            duration: { type: Type.NUMBER },
                        }
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
                                rotation: { type: Type.NUMBER },
                                flipX: { type: Type.BOOLEAN },
                                flipY: { type: Type.BOOLEAN },
                                opacity: { type: Type.NUMBER },
                                animation: animationSchema,
                                exitAnimation: animationSchema,
                                content: {
                                    type: Type.OBJECT,
                                    properties: {
                                        // Text
                                        text: { type: Type.STRING },
                                        fontFamily: { type: Type.STRING },
                                        fontSize: { type: Type.NUMBER },
                                        fontWeight: { type: Type.STRING },
                                        fontStyle: { type: Type.STRING },
                                        textDecoration: { type: Type.STRING },
                                        textAlign: { type: Type.STRING },
                                        color: { type: Type.STRING },
                                        backgroundColor: { type: Type.STRING },
                                        letterSpacing: { type: Type.NUMBER },
                                        lineHeight: { type: Type.NUMBER },
                                        paragraphSpacing: { type: Type.NUMBER },
                                        overflow: { type: Type.STRING },
                                        textTransform: { type: Type.STRING },
                                        strokeColor: { type: Type.STRING },
                                        strokeWidth: { type: Type.NUMBER },
                                        
                                        // Image
                                        src: { type: Type.STRING },
                                        altText: { type: Type.STRING },
                                        borderRadius: { type: Type.NUMBER },
                                        objectFit: { type: Type.STRING },
                                        
                                        // Video
                                        thumbnail: { type: Type.STRING },
                
                                        // Shape & Icon
                                        shape: { type: Type.STRING },
                                        fillColor: { type: Type.STRING },
                                        borderColor: { type: Type.STRING },
                                        borderWidth: { type: Type.NUMBER },
                                        borderStyle: { type: Type.STRING },
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
    const ai = getAiClient();
    if (!ai) throw new Error("GoogleGenAI not initialized");
    const systemInstruction = `You are an AI assistant integrated into a presentation editor. Your task is to modify a presentation based on user commands. The user will provide the current presentation's state as a JSON object and a command in plain text. You must return the *entire*, updated presentation JSON object, conforming strictly to the provided schema. Do not add any conversational text or markdown. Just return the JSON.

**Available actions based on commands:**
- "add a new slide": Add a new slide to the 'slides' array. Give it a unique ID and default notes.
- "change the title of slide 2": Find the slide with the matching index and modify its title object.
- "add a text box with 'Hello'": Add a new text object to the current slide's 'objects' array with all default properties.
- "add a slide about AI with the text 'AI is transforming our world'": Create a new slide. Add a text object for a title, like "The Rise of AI". Add another text object for the body content 'AI is transforming our world'. Style the title to be larger and bolder than the body text, and center both horizontally.
- "delete slide 3": Remove the slide at the specified index from the 'slides' array.
- "change the background of the current slide to blue": Modify the 'background' property of the specified slide.
- "flip the selected image vertically": Set the 'flipY' property of the object to true.
- "make the title bounce in": Set the 'animation' property of the title object to '{ "preset": "bounce-in", "trigger": "on-load", "duration": 1000, "delay": 0, "loop": false }'.
- "make the image fade out on click": Set the 'exitAnimation' property of the image to '{ "preset": "fade-out", "trigger": "on-click", "duration": 500, "delay": 0, "loop": false }'.
- "make the star spin continuously": Find an object that looks like a star and set its animation to loop. e.g. '{ "preset": "spin", "trigger": "on-load", "duration": 2000, "delay": 0, "loop": true }'.
- "use a cube transition for this slide": Set the current slide's 'transition' preset to 'cube-rotate' and suggest a longer duration like 1000ms.
- "make the slide transition faster": Decrease the 'duration' of the current slide's 'transition' property.
- "add a parallax effect": Apply different parallax-drift presets to objects to create a sense of depth, e.g., 'parallax-drift-slow' for backgrounds and 'parallax-drift-fast' for foreground text.

Always preserve existing IDs for objects and slides unless creating a new one. Ensure the output is a single, valid JSON object. For exit animations, if one does not exist, you can add one. If the user asks to remove an animation, set the animation or exitAnimation property to null.`;

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

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    const ai = getAiClient();
    if (!ai) throw new Error("GoogleGenAI not initialized");
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio,
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const editImage = async (imageDataUrl: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) throw new Error("GoogleGenAI not initialized");

    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) throw new Error("Invalid image data URL format");
    const mimeType = match[1];
    const base64Data = match[2];

    const imagePart = {
        inlineData: { data: base64Data, mimeType },
    };
    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const newMimeType = part.inlineData.mimeType;
            return `data:${newMimeType};base64,${base64ImageBytes}`;
        }
    }
    throw new Error("No image was returned from the edit operation.");
};

export const analyzeImage = async (imageDataUrl: string, prompt: string): Promise<{ text: string }> => {
    const ai = getAiClient();
    if (!ai) throw new Error("GoogleGenAI not initialized");
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) throw new Error("Invalid image data URL format");
    const mimeType = match[1];
    const base64Data = match[2];

    const imagePart = {
        inlineData: { data: base64Data, mimeType },
    };
    const textPart = { text: prompt || "Analyze this image in detail." };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    return { text: response.text };
};

const generateVideoThumbnail = (videoSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous'; // Important for cross-origin blobs
        const canvas = document.createElement('canvas');
        video.onloadeddata = () => {
            video.currentTime = 1; // Seek to the 1-second mark
        };
        video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            resolve(canvas.toDataURL('image/jpeg'));
            URL.revokeObjectURL(video.src); // Clean up
        };
        video.onerror = (e) => {
            reject(new Error(`Failed to load video for thumbnail generation. Error: ${e}`));
            URL.revokeObjectURL(video.src); // Clean up
        };
        video.src = videoSrc;
    });
};

export const generateVideo = async (prompt: string, baseImage?: string): Promise<{videoSrc: string, thumbnailSrc: string}> => {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        throw new Error("API key required for video generation. Please select a key.");
    }
    const ai = getAiClient(); // Re-init to get the latest key
    
    let imagePayload: Image | undefined = undefined;
    if (baseImage) {
        const match = baseImage.match(/^data:(image\/\w+);base64,(.*)$/);
        if (!match) throw new Error("Invalid image data URL format for video generation");
        imagePayload = {
            mimeType: match[1],
            imageBytes: match[2],
        };
    }

    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: imagePayload,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
         throw new Error('Video generation finished, but no download link was provided.');
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download the generated video. Status: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    const videoSrc = URL.createObjectURL(videoBlob);
    
    const thumbnailSrc = await generateVideoThumbnail(videoSrc);

    return { videoSrc, thumbnailSrc };
}

type PresentationToolResponse =
  | { type: 'generate_image'; prompt: string; aspectRatio: AspectRatio }
  | { type: 'edit_image'; prompt: string }
  | { type: 'generate_video'; prompt: string }
  | { type: 'layout_slide' }
  | { type: 'presentation_edit' };

export const understandPresentationPrompt = async (prompt: string, selectedImageSrc?: string): Promise<PresentationToolResponse> => {
    const ai = getAiClient();
    if (!ai) throw new Error("GoogleGenAI not initialized");

    const tools: FunctionDeclaration[] = [
        {
            name: 'generate_image',
            description: 'Generates a new image from a text prompt to be added to the slide.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    prompt: { type: Type.STRING, description: 'A detailed description of the image to generate.' },
                    aspectRatio: { type: Type.STRING, description: 'The aspect ratio for the image, e.g., "16:9", "1:1". Defaults to "16:9".' }
                },
                required: ['prompt']
            }
        },
        {
            name: 'edit_image',
            description: 'Edits the currently selected image based on a text prompt.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    prompt: { type: Type.STRING, description: 'Instructions on how to modify the selected image, e.g., "make it black and white" or "add a hat to the person".' }
                },
                required: ['prompt']
            }
        },
        {
            name: 'generate_video',
            description: 'Generates a video from a text prompt. If an image is selected, it will be used as the starting frame.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    prompt: { type: Type.STRING, description: 'A detailed description of the video to generate.' }
                },
                required: ['prompt']
            }
        },
        {
            name: 'layout_slide',
            description: 'Intelligently rearranges the objects on the current slide for a better visual layout. Use for prompts like "arrange this slide", "make it look nice", or "magic layout".',
            parameters: { type: Type.OBJECT, properties: {} }
        }
    ];

    const systemInstruction = `You are a helpful presentation assistant. Your job is to understand the user's request and decide which tool to use.
- If the user wants to create a new image, use \`generate_image\`.
- If the user wants to modify the currently selected image, use \`edit_image\`.
- If the user wants to create a new video, use \`generate_video\`.
- If the user wants to rearrange the current slide, use \`layout_slide\`.
- For any other request related to changing the presentation (like adding slides, deleting text, changing colors), do not use a tool. The main system will handle it as a general presentation edit.
- If an image is selected by the user, and their prompt is ambiguous, assume they want to EDIT the image. For example, if an image of a dog is selected and the prompt is "make it a robot dog", use \`edit_image\`. If no image is selected, the same prompt should use \`generate_image\`.
- If a user asks to "animate this image" or something similar with an image selected, use \`generate_video\`.
- Be specific in the prompts you extract for the tools. For "Generate an image of a cat wearing a party hat", the prompt is "A cat wearing a party hat".
`;
    
    let fullPrompt = `User prompt: "${prompt}"`;
    if (selectedImageSrc) {
        fullPrompt += "\n\nThe user currently has an image selected on the slide."
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullPrompt,
        config: {
            systemInstruction,
            tools: [{ functionDeclarations: tools }],
        }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
        const fc = response.functionCalls[0];
        switch (fc.name) {
            case 'generate_image':
// Fix: Add type assertions for function call arguments, which are typed as `unknown`.
                return { type: 'generate_image', prompt: fc.args.prompt as string, aspectRatio: (fc.args.aspectRatio as AspectRatio) || '16:9' };
            case 'edit_image':
// Fix: Add type assertions for function call arguments, which are typed as `unknown`.
                return { type: 'edit_image', prompt: fc.args.prompt as string };
            case 'generate_video':
// Fix: Add type assertions for function call arguments, which are typed as `unknown`.
                return { type: 'generate_video', prompt: fc.args.prompt as string };
            case 'layout_slide':
                return { type: 'layout_slide' };
            default:
                 return { type: 'presentation_edit' };
        }
    }

    return { type: 'presentation_edit' };
};

export const layoutSlide = async (slide: Slide, width: number, height: number): Promise<Slide> => {
    const ai = getAiClient();
    if (!ai) throw new Error("GoogleGenAI not initialized");
    
    const objectsForPrompt = slide.objects.map((o) => ({
        id: o.id,
        type: o.type,
        width: o.width,
        height: o.height,
        text: o.type === 'text' ? (o.content as TextContent).text.substring(0, 100) : undefined
    }));

    const systemInstruction = `You are an expert presentation designer. Given a JSON array of slide objects, your task is to rearrange them into a visually appealing and professional layout. Maintain the original IDs. Return ONLY a valid JSON array of objects, where each object contains the 'id' and the new 'x', 'y', 'width', and 'height' properties.

**Layout Principles:**
- **Hierarchy:** Titles should be prominent and at the top.
- **Alignment:** Align objects to a common grid.
- **Balance:** Distribute objects evenly.
- **Proximity:** Group related items.
- **Whitespace:** Use negative space effectively.

**Canvas Dimensions:** The slide canvas is ${width}px wide and ${height}px high. All coordinates and dimensions must be within these bounds. Objects should not overlap.`;
    
    const fullPrompt = `Current slide objects:
\`\`\`json
${JSON.stringify(objectsForPrompt)}
\`\`\`
Based on the design principles, provide the new layout attributes for these objects.`;

    const layoutSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER },
            },
            required: ['id', 'x', 'y', 'width', 'height'],
        }
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: fullPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: layoutSchema,
            }
        });
        
        const newLayouts = JSON.parse(response.text) as {id: string; x: number; y: number; width: number; height: number;}[];
        const layoutMap = new Map(newLayouts.map(l => [l.id, l]));

        const updatedObjects = slide.objects.map((obj) => {
            const newLayout = layoutMap.get(obj.id);
            return newLayout ? { ...obj, ...newLayout } : obj;
        });

        return { ...slide, objects: updatedObjects };

    } catch (error) {
        console.error("Failed to generate slide layout:", error);
        throw new Error(`The AI failed to generate a new layout. ${error instanceof Error ? error.message : ''}`);
    }
};