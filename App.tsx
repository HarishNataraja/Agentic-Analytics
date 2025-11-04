import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MessageInput from './components/MessageInput';
import DashboardView from './components/dashboard/DashboardView';
import DataConnectionsView from './components/data_connections/DataConnectionsView';
import PresentationWorkspace from './components/presentation/PresentationWorkspace';
import PresentationPlayer from './components/presentation/PresentationPlayer';
import ProjectsView from './components/ProjectsView';
import { Agent, Message, AspectRatio, ChartData, User, DashboardItem, Presentation, Slide, SlideObject, ImageContent, VideoContent, DataConnection, ChartItem, Project } from './types';
import * as geminiService from './services/geminiService';
import * as mcpService from './services/mcpService';
import { readFileContent, readFileAsDataURL } from './utils/fileUtils';
import { createPcmBlob, decode, decodeAudioData } from './utils/audioUtils';
import { LiveServerMessage } from '@google/genai';
import ChatWindow from './components/ChatWindow';
import { ThinkingIcon, ChevronLeftIcon } from './components/icons';
import { parseCsv, toCsv } from './utils/dataUtils';
// Fix: Import `Layout` type from `react-grid-layout` to correctly type layout handlers.
import { type Layout } from 'react-grid-layout';

const MAX_DATA_CONTEXT_LENGTH = 500000;

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
        const saved = localStorage.getItem('agentic_projects');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  const [activeAgent, setActiveAgent] = useState<Agent>(Agent.DATA_ANALYSIS);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [user, setUser] = useState<User | null>({ id: 'dev-user', email: 'developer@example.com' });
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDashboardGenerating, setIsDashboardGenerating] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);

  const liveSessionRef = useRef<geminiService.LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextAudioStartTimeRef = useRef<number>(0);
  const currentTranscriptionRef = useRef({ input: '', output: '' });

  const currentProject = projects.find(p => p.id === currentProjectId);

  useEffect(() => {
    localStorage.setItem('agentic_projects', JSON.stringify(projects));
  }, [projects]);
  
  const updateCurrentProject = (updateFn: (project: Project) => Project) => {
      setProjects(prev => prev.map(p => p.id === currentProjectId ? updateFn(p) : p));
  };
  
  const handleSelectProject = (projectId: string) => {
      setCurrentProjectId(projectId);
      setActiveAgent(Agent.DATA_ANALYSIS); // Reset to default agent on project switch
  };

  const handleCreateProject = (name: string) => {
      const newProject: Project = {
          id: `proj-${Date.now()}`,
          name,
          createdAt: new Date().toISOString(),
          messages: [],
          dataContext: null,
          dashboardItems: [],
          dashboardData: null,
          activeFilters: {},
          presentation: null,
          presentationMessages: [],
          presentationHistory: [],
          presentationHistoryIndex: -1,
          selectedSlideId: null,
          selectedObjectIds: [],
          dataConnections: [],
      };
      setProjects(prev => [...prev, newProject]);
      setCurrentProjectId(newProject.id);
  };
  
  const handleGoToProjects = () => {
      setCurrentProjectId(null);
  };

  const handleLogout = () => {
    window.location.reload();
  };

  const handleAgentChange = (agent: Agent) => {
    setActiveAgent(agent);
    setIsPresenting(false); 
    
    if(agent === Agent.PRESENTATION && currentProject && !currentProject.presentation) {
        const blankPresentation = geminiService.createBlankPresentation();
        updateCurrentProject(p => ({
            ...p,
            presentation: blankPresentation,
            presentationHistory: [blankPresentation],
            presentationHistoryIndex: 0,
            selectedSlideId: blankPresentation.slides[0].id
        }));
    }
  };
  
  const handleSaveToDashboard = (chartData: ChartData, title: string) => {
    if (!currentProject) return;

    const layouts = currentProject.dashboardItems.map(item => item.layout);
    const newY = layouts.length > 0 ? Math.max(0, ...layouts.map(l => l.y + l.h)) : 0;

    const newItem: ChartItem = {
      id: `dash-${Date.now()}`,
      type: 'chart',
      title: title.split('\n')[0], 
      data: chartData,
      layout: { x: 0, y: newY, w: 6, h: 4 }
    };
    updateCurrentProject(p => ({
        ...p,
        dashboardItems: [...p.dashboardItems, newItem],
        messages: [...p.messages, {
            id: Date.now().toString(),
            sender: 'bot',
            text: `Chart "${newItem.title}" saved to dashboard.`
        }]
    }));
    setActiveAgent(Agent.DASHBOARD);
  };

  const parseResponse = (responseText: string) => {
      const jsonRegex = /```json\n([\s\S]*?)\n```/;
      const suggestionRegex = /^\d+\.\s*(.+)$/gm;
      let chartData: ChartData | undefined;
      let textPart = responseText;
      let suggestions: string[] = [];
      const chartMatch = responseText.match(jsonRegex);
      if (chartMatch && (activeAgent === Agent.DATA_ANALYSIS || activeAgent === Agent.DASHBOARD)) {
          try {
              chartData = JSON.parse(chartMatch[1]);
              textPart = responseText.replace(jsonRegex, '').trim();
          } catch (e) { console.error("Failed to parse chart JSON:", e); }
      }
      const suggestionMatches = [...textPart.matchAll(suggestionRegex)];
      if (suggestionMatches.length > 0) {
          suggestions = suggestionMatches.map(match => match[1].trim().replace(/^"|"$/g, ''));
      }
      return { text: textPart, chart: chartData, suggestions };
  };

  const processAndDisplayResponse = (responseText: string, messageId: string, sources?: any[]) => {
      const { text, chart, suggestions } = parseResponse(responseText);
      updateCurrentProject(p => ({
          ...p,
          messages: p.messages.map(m => m.id === messageId ? { ...m, text, chart, suggestions, isLoading: false, sources } : m)
      }));
  }

  const handlePresentationAi = async (prompt: string, userMessage: Message) => {
    if (!currentProject || !currentProject.presentation) return;

    updateCurrentProject(p => ({ ...p, presentationMessages: [...p.presentationMessages, userMessage] }));
    const botMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = { id: botMessageId, sender: 'bot', isLoading: true };
    updateCurrentProject(p => ({ ...p, presentationMessages: [...p.presentationMessages, loadingMessage] }));

    try {
        const { presentation, selectedSlideId, selectedObjectIds } = currentProject;
        const selectedSlide = presentation.slides.find(s => s.id === selectedSlideId);
        const selectedImage = selectedSlide?.objects.find(o => selectedObjectIds.length === 1 && o.id === selectedObjectIds[0] && o.type === 'image') as SlideObject | undefined;
        const selectedImageDataUrl = (selectedImage?.content as ImageContent)?.src;

        const result = await geminiService.understandPresentationPrompt(prompt, selectedImageDataUrl);
        
        const updateBotMessage = (update: Partial<Message>) => {
            updateCurrentProject(p => ({
                ...p,
                presentationMessages: p.presentationMessages.map(m => m.id === botMessageId ? {...m, ...update} : m)
            }));
        };

        const handleSetPresentation = (newPresentation: Presentation, newHistoryEntry = true) => {
            updateCurrentProject(p => {
                const history = newHistoryEntry ? p.presentationHistory.slice(0, p.presentationHistoryIndex + 1) : p.presentationHistory;
                const newHistory = newHistoryEntry ? [...history, newPresentation] : history.map((pres, i) => i === p.presentationHistoryIndex ? newPresentation : pres);
                return {
                    ...p,
                    presentation: newPresentation,
                    presentationHistory: newHistory,
                    presentationHistoryIndex: newHistoryEntry ? history.length : p.presentationHistoryIndex
                }
            });
        };

        switch (result.type) {
            case 'generate_image':
                updateBotMessage({ text: "Generating image...", isLoading: false, isThinking: true });
                const newImageSrc = await geminiService.generateImage(result.prompt, result.aspectRatio);
                const imageContent: ImageContent = { src: newImageSrc, altText: result.prompt, borderRadius: 0, borderColor: '#000000', borderWidth: 0, objectFit: 'cover', filters: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, blur: 0 }};
                if (selectedImage) {
                    const newSlides = presentation.slides.map(s => s.id === selectedSlideId ? { ...s, objects: s.objects.map(o => o.id === selectedImage.id ? { ...o, content: imageContent } : o) } : s);
                    handleSetPresentation({ ...presentation, slides: newSlides });
                } else {
                    const newImageObject: SlideObject = { id: `obj-img-${Date.now()}`, type: 'image', x: 100, y: 100, width: 600, height: 400, rotation: 0, flipX: false, flipY: false, opacity: 1, animation: { preset: 'fade-in', trigger: 'on-load', duration: 500, delay: 0, loop: false }, exitAnimation: null, content: imageContent };
                    const newSlides = presentation.slides.map(s => s.id === selectedSlideId ? { ...s, objects: [...s.objects, newImageObject] } : s);
                    handleSetPresentation({ ...presentation, slides: newSlides });
                }
                updateBotMessage({ isThinking: false, text: "Here is the generated image.", image: newImageSrc });
                break;
            
            case 'generate_video':
                updateBotMessage({ text: "Generating video... This can take a few minutes.", isLoading: false, isThinking: true });
                try {
                    const { videoSrc, thumbnailSrc } = await geminiService.generateVideo(result.prompt, selectedImageDataUrl);
                    const videoContent: VideoContent = { src: videoSrc, thumbnail: thumbnailSrc };
                    const newVideoObject: SlideObject = { id: `obj-vid-${Date.now()}`, type: 'video', x: 100, y: 100, width: 640, height: 360, rotation: 0, flipX: false, flipY: false, opacity: 1, animation: { preset: 'fade-in', trigger: 'on-load', duration: 500, delay: 0, loop: false }, exitAnimation: null, content: videoContent };
                    const newSlides = presentation.slides.map(s => s.id === selectedSlideId ? { ...s, objects: [...s.objects, newVideoObject] } : s);
                    handleSetPresentation({ ...presentation, slides: newSlides });
                    updateBotMessage({ isThinking: false, text: "Here is the generated video.", video: videoSrc });
                } catch(e) {
                    if (e instanceof Error && e.message.includes('API key')) {
                        setIsApiKeyModalOpen(true);
                        updateBotMessage({ isThinking: false, text: e.message });
                    } else { throw e; }
                }
                break;

            case 'edit_image':
                if (!selectedImageDataUrl) {
                    updateBotMessage({ isLoading: false, text: "Please select an image first to edit it." });
                    return;
                }
                updateBotMessage({ text: "Editing image...", isLoading: false, isThinking: true });
                const editedImageSrc = await geminiService.editImage(selectedImageDataUrl, result.prompt);
                const editedImageContent: ImageContent = { ...(selectedImage!.content as ImageContent), src: editedImageSrc };
                const newSlidesEdited = presentation.slides.map(s => s.id === selectedSlideId ? { ...s, objects: s.objects.map(o => o.id === selectedImage!.id ? { ...o, content: editedImageContent } : o) } : s);
                handleSetPresentation({ ...presentation, slides: newSlidesEdited });
                updateBotMessage({ isThinking: false, text: "Here is the edited image.", image: editedImageSrc });
                break;

            case 'presentation_edit':
                const updatedPresentation = await geminiService.editPresentation(prompt, presentation);
                handleSetPresentation(updatedPresentation);
                updateBotMessage({ isLoading: false, text: "Done! I've updated the presentation." });
                break;
        }
    } catch(error) {
        console.error("Error with presentation AI:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        updateCurrentProject(p => ({
            ...p,
            presentationMessages: p.presentationMessages.map(m => m.id === botMessageId ? { ...m, isLoading: false, text: `Sorry, I couldn't do that: ${errorMessage}` } : m)
        }));
    }
  }

  const handleSendMessage = async (prompt: string, file?: File) => {
    if (activeAgent === Agent.PRESENTATION) {
        const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: prompt };
        await handlePresentationAi(prompt, userMessage);
        return;
    }
    if (!currentProject) return;
    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: prompt, fileInfo: file ? { name: file.name } : undefined };

    let messagesToAdd: Message[] = [userMessage];
    let contextForPrompt: string | null = null;
    let newDataContext = currentProject.dataContext;
    
    if (activeAgent === Agent.DASHBOARD && currentProject.dashboardData) {
        contextForPrompt = toCsv(currentProject.dashboardData);
    } else if (file) {
        try {
            let fileContent = await readFileContent(file);
            if (fileContent.length > MAX_DATA_CONTEXT_LENGTH) {
                fileContent = fileContent.substring(0, MAX_DATA_CONTEXT_LENGTH);
                messagesToAdd.push({ id: Date.now().toString() + "-truncation", sender: 'bot', text: `(Note: The uploaded file is very large. Only the beginning will be analyzed.)` });
            }
            newDataContext = fileContent;
            contextForPrompt = fileContent;
        } catch (error) {
             const errorMessage: Message = { id: (Date.now() + 1).toString(), sender: 'bot', text: `Sorry, I couldn't read the file. Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
             updateCurrentProject(p => ({ ...p, messages: [...p.messages, userMessage, errorMessage] }));
             return;
        }
    } else {
        contextForPrompt = currentProject.dataContext;
    }
    
    const botMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = { id: botMessageId, sender: 'bot', isLoading: true, isThinking: isThinkingMode };
    updateCurrentProject(p => ({ ...p, messages: [...p.messages, ...messagesToAdd, loadingMessage], dataContext: newDataContext }));

    try {
        const hasDataContext = !!contextForPrompt;
        let promptForApi = prompt;
        
        const systemInstruction = hasDataContext 
            ? `You are an expert Data Analyst AI. The user has provided a dataset. Your goal is to help them understand it.
- When the user asks for a visual, chart, plot, or graph, YOU MUST respond with a valid JSON object formatted for the Recharts library.
- NEVER, under any circumstances, respond with Python code or any other programming language. Your output for a visual MUST be the specified JSON format.
- The JSON should be in a markdown block like this: \`\`\`json\n{...}\n\`\`\`
- For bar, line, or pie charts, use the format: { "type": "bar", "data": [...], "dataKey": "...", "nameKey": "..." }
- For scatter plots, use the format: { "type": "scatter", "data": [{"x": 1, "y": 2}, ...], "xKey": "...", "yKey": "...", "xAxisLabel": "...", "yAxisLabel": "..." }
- Also provide a brief text description of the chart's insights.
- If you are asked a general question, provide a text response.`
            : "You are a friendly and helpful AI assistant...";

        if (contextForPrompt) {
            promptForApi = `Data context:\n\`\`\`\n${contextForPrompt}\n\`\`\`\n\nUser query: ${prompt}`;
        }
        
        const response = await geminiService.generateText(promptForApi, isThinkingMode, systemInstruction);
        processAndDisplayResponse(response.text, botMessageId, response.sources);
        
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        updateCurrentProject(p => ({ ...p, messages: p.messages.map(m => m.id === botMessageId ? { ...m, text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`, isLoading: false } : m) }));
    }
  };

  const handleSaveConnection = async (connection: DataConnection, fileContent?: string, shouldAnalyze?: boolean) => {
    if (!currentProject) return;
    const connectionWithContent: DataConnection = { ...connection, fileContent };
    
    const exists = currentProject.dataConnections.some(c => c.id === connectionWithContent.id);
    updateCurrentProject(p => ({
        ...p,
        dataConnections: exists ? p.dataConnections.map(c => c.id === connectionWithContent.id ? connectionWithContent : c) : [...p.dataConnections, connectionWithContent]
    }));

    if (shouldAnalyze && fileContent) {
        setIsDashboardGenerating(true);
        try {
            const parsedData = parseCsv(fileContent);
            const dashboardLayout = await mcpService.generateDashboardFromData(fileContent);
            updateCurrentProject(p => ({
                ...p,
                dashboardData: parsedData,
                dashboardItems: dashboardLayout
            }));
            setActiveAgent(Agent.DASHBOARD);
        } catch (error) {
            console.error("Dashboard generation failed:", error);
            const errorMsg: Message = { id: Date.now().toString(), sender: 'bot', text: `Failed to generate dashboard: ${error instanceof Error ? error.message : "An unknown error occurred."}`};
            updateCurrentProject(p => ({ ...p, messages: [errorMsg], dashboardData: null, dashboardItems: [] }));
            setActiveAgent(Agent.DATA_ANALYSIS);
        } finally {
            setIsDashboardGenerating(false);
        }
    }
  };

  const handleDeleteDashboardItem = (itemId: string) => {
    updateCurrentProject(p => ({
        ...p,
        dashboardItems: p.dashboardItems.filter(item => item.id !== itemId)
    }));
  };

  const handleLayoutChange = (layout: Layout[]) => {
    updateCurrentProject(p => ({
        ...p,
        dashboardItems: p.dashboardItems.map(item => {
            const layoutItem = layout.find(l => l.i === item.id);
            if (layoutItem) {
                return { ...item, layout: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h } };
            }
            return item;
        }).filter(Boolean)
    }));
  };
  
  const stopVoice = useCallback(() => {
    if (!isVoiceRecording) return;

    liveSessionRef.current?.close();
    liveSessionRef.current = null;

    audioStreamRef.current?.getTracks().forEach(track => track.stop());
    audioStreamRef.current = null;

    if (scriptProcessorRef.current && inputAudioContextRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }

    inputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;

    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;
    
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();

    setIsVoiceRecording(false);
    
    updateCurrentProject(p => ({
        ...p,
        messages: [...p.messages, { id: Date.now().toString(), sender: 'bot', text: "Voice conversation ended." }]
    }));
  }, [isVoiceRecording]);

  const startVoice = useCallback(async () => {
    if (isVoiceRecording) {
      stopVoice();
      return;
    }

    if (!currentProject) return;
    
    updateCurrentProject(p => ({
        ...p,
        messages: [{ id: Date.now().toString(), sender: 'bot', text: "Voice conversation started. Start speaking..." }]
    }));

    setIsVoiceRecording(true);

    try {
        const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        inputAudioContextRef.current = inputAudioContext;
        const outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        outputAudioContextRef.current = outputAudioContext;
        
        nextAudioStartTimeRef.current = 0;
        currentTranscriptionRef.current = { input: '', output: '' };

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        const sessionPromise = geminiService.startLiveSession({
            onopen: () => {
                const source = inputAudioContext.createMediaStreamSource(stream);
                const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = scriptProcessor;

                scriptProcessor.onaudioprocess = (audioProcessingEvent: AudioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    sessionPromise.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio && outputAudioContextRef.current) {
                    const outputAudioContext = outputAudioContextRef.current;
                    const nextStartTime = Math.max(nextAudioStartTimeRef.current, outputAudioContext.currentTime);
                    nextAudioStartTimeRef.current = nextStartTime;

                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputAudioContext.destination);
                    source.addEventListener('ended', () => {
                        audioSourcesRef.current.delete(source);
                    });
                    source.start(nextStartTime);
                    nextAudioStartTimeRef.current += audioBuffer.duration;
                    audioSourcesRef.current.add(source);
                }

                const interrupted = message.serverContent?.interrupted;
                if (interrupted) {
                    for (const source of audioSourcesRef.current.values()) {
                      source.stop();
                    }
                    audioSourcesRef.current.clear();
                    nextAudioStartTimeRef.current = 0;
                }
                
                if (message.serverContent?.inputTranscription) {
                    currentTranscriptionRef.current.input += message.serverContent.inputTranscription.text;
                }
                if (message.serverContent?.outputTranscription) {
                    currentTranscriptionRef.current.output += message.serverContent.outputTranscription.text;
                }
                if (message.serverContent?.turnComplete) {
                    if (currentTranscriptionRef.current.input) {
                        updateCurrentProject(p => ({ ...p, messages: [...p.messages, { id: `transcript-in-${Date.now()}`, sender: 'user', transcript: { type: 'input', text: currentTranscriptionRef.current.input } }] }));
                    }
                     if (currentTranscriptionRef.current.output) {
                        updateCurrentProject(p => ({ ...p, messages: [...p.messages, { id: `transcript-out-${Date.now()}`, sender: 'bot', transcript: { type: 'output', text: currentTranscriptionRef.current.output } }] }));
                    }
                    currentTranscriptionRef.current = { input: '', output: '' };
                }
            },
            onerror: (e: ErrorEvent) => {
                console.error("Live session error:", e);
                updateCurrentProject(p => ({...p, messages: [...p.messages, { id: Date.now().toString(), sender: 'bot', text: `Voice Error: ${e.message}` }] }));
                stopVoice();
            },
            onclose: (e: CloseEvent) => {
                console.log("Live session closed.");
                if (isVoiceRecording) {
                    stopVoice();
                }
            },
        });
        
        liveSessionRef.current = await sessionPromise;

    } catch (error) {
        console.error("Failed to start voice session:", error);
        updateCurrentProject(p => ({...p, messages: [...p.messages, { id: Date.now().toString(), sender: 'bot', text: `Could not start voice session: ${error instanceof Error ? error.message : "Unknown error"}` }] }));
        setIsVoiceRecording(false);
    }
  }, [isVoiceRecording, stopVoice, currentProject]);

  useEffect(() => { return () => { if (isVoiceRecording) stopVoice(); } }, [isVoiceRecording, stopVoice]);

  const renderMainContent = () => {
    if (!currentProjectId || !currentProject) {
        return <ProjectsView projects={projects} onSelectProject={handleSelectProject} onCreateProject={handleCreateProject} />
    }
    
    switch(activeAgent) {
        case Agent.DATA_CONNECTIONS:
            return <DataConnectionsView projectConnections={currentProject.dataConnections} allProjects={projects} onSaveConnection={handleSaveConnection} />;
        case Agent.DASHBOARD:
            return <DashboardView 
                        items={currentProject.dashboardItems} 
                        dashboardData={currentProject.dashboardData} 
                        activeFilters={currentProject.activeFilters} 
                        onFilterChange={(column, value) => updateCurrentProject(p => ({ ...p, activeFilters: { ...p.activeFilters, [column]: value } }))}
                        onClearFilters={() => updateCurrentProject(p => ({ ...p, activeFilters: {} }))}
                        onChartTypeChange={(itemId, newType) => updateCurrentProject(p => ({ ...p, dashboardItems: p.dashboardItems.map(item => item.id === itemId && item.type === 'chart' ? { ...item, data: { ...item.data, type: newType } as ChartData } : item) }))}
                        onLayoutChange={handleLayoutChange}
                        onDeleteItem={handleDeleteDashboardItem}
                        messages={currentProject.messages}
                        onSendMessage={handleSendMessage}
                        isThinkingMode={isThinkingMode}
                        onThinkingChange={setIsThinkingMode}
                        isVoiceRecording={isVoiceRecording}
                        onVoiceRecordStart={startVoice}
                        onVoiceRecordStop={stopVoice}
                        onSaveToDashboard={handleSaveToDashboard}
                    />;
        case Agent.PRESENTATION:
            if (isPresenting && currentProject.presentation) {
                return <PresentationPlayer presentation={currentProject.presentation} onExit={() => setIsPresenting(false)} />
            }
            if (currentProject.presentation) {
                return <PresentationWorkspace 
                            presentation={currentProject.presentation}
                            dashboardItems={currentProject.dashboardItems.filter(item => item.type === 'chart') as ChartItem[]}
                            onPresentationChange={(newPres: Presentation, historyEntry?: boolean) => {
                                const { presentationHistory, presentationHistoryIndex } = currentProject;
                                const newHistory = historyEntry ? presentationHistory.slice(0, presentationHistoryIndex + 1) : presentationHistory;
                                const finalHistory = historyEntry ? [...newHistory, newPres] : newHistory.map((pres, i) => i === presentationHistoryIndex ? newPres : pres);
                                updateCurrentProject(p => ({ ...p, presentation: newPres, presentationHistory: finalHistory, presentationHistoryIndex: historyEntry ? newHistory.length : presentationHistoryIndex }));
                            }}
                            onUndo={() => updateCurrentProject(p => ({...p, presentationHistoryIndex: Math.max(0, p.presentationHistoryIndex - 1), presentation: p.presentationHistory[p.presentationHistoryIndex - 1] || p.presentation }))}
                            onRedo={() => updateCurrentProject(p => ({...p, presentationHistoryIndex: Math.min(p.presentationHistory.length - 1, p.presentationHistoryIndex + 1), presentation: p.presentationHistory[p.presentationHistoryIndex + 1] || p.presentation}))}
                            canUndo={currentProject.presentationHistoryIndex > 0}
                            canRedo={currentProject.presentationHistoryIndex < currentProject.presentationHistory.length - 1}
                            onPresent={() => setIsPresenting(true)}
                            messages={currentProject.presentationMessages}
                            onSendMessage={handleSendMessage}
                            selectedSlideId={currentProject.selectedSlideId}
                            onSelectSlide={(id) => updateCurrentProject(p => ({ ...p, selectedSlideId: id }))}
                            selectedObjectIds={currentProject.selectedObjectIds}
                            onSelectObjects={(ids) => updateCurrentProject(p => ({ ...p, selectedObjectIds: ids }))}
                        />;
            }
            return null;
        case Agent.DATA_ANALYSIS:
        default:
            const initialSuggestions = [ "Upload a CSV and find correlations", "Explain the key insights from my data file", "Create a bar chart of sales by region", "Summarize this dataset for me" ];
            const lastBotMessageWithSuggestions = [...currentProject.messages].reverse().find(m => m.sender === 'bot' && m.suggestions && m.suggestions.length > 0);
            const suggestions = currentProject.messages.length === 0 ? initialSuggestions : (lastBotMessageWithSuggestions?.suggestions || []);


            return (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <ChatWindow 
                        messages={currentProject.messages} 
                        onSaveToDashboard={handleSaveToDashboard}
                        dataConnections={currentProject.dataConnections.filter(c => c.fileContent)}
                        hasDataContext={!!currentProject.dataContext}
                        onSelectDataConnection={(content) => updateCurrentProject(p => ({ ...p, dataContext: content, messages: [{ id: Date.now().toString(), sender: 'bot', text: "Data context set. Ready for questions." }] }))}
                    />
                    {suggestions.length > 0 && (
                        <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
                                Suggestions
                            </h4>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {suggestions.slice(0, 4).map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSendMessage(suggestion)}
                                        className="px-3 py-1 text-sm font-medium bg-white dark:bg-gray-700 rounded-full shadow-sm whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <MessageInput onSendMessage={handleSendMessage} agent={activeAgent} isThinking={isThinkingMode} onThinkingChange={setIsThinkingMode} isVoiceRecording={isVoiceRecording} onVoiceRecordStart={startVoice} onVoiceRecordStop={stopVoice} aspectRatio={aspectRatio} onAspectRatioChange={setAspectRatio} />
                </div>
            );
    }
  };

  return (
    <div className="flex h-screen font-sans text-gray-900 dark:text-gray-100">
      <Sidebar 
        activeAgent={activeAgent} 
        onAgentChange={handleAgentChange} 
        user={user} 
        onLogout={handleLogout} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isProjectView={!currentProjectId}
      />
      <main className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <header className="flex items-center p-2 pl-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 h-14 flex-shrink-0">
            {!currentProject ? (
                 <h1 className="text-lg font-semibold truncate">Your Projects</h1>
            ) : (
                <>
                    <button onClick={handleGoToProjects} className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                        <ChevronLeftIcon className="w-5 h-5"/>
                        <span>Projects</span>
                    </button>
                    <span className="mx-2 text-gray-300 dark:text-gray-600">/</span>
                    <h1 className="text-lg font-semibold truncate">{currentProject.name}</h1>
                </>
            )}
        </header>
        {renderMainContent()}
      </main>
      
      {isDashboardGenerating && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                <ThinkingIcon className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
                <h2 className="text-2xl font-bold mt-6">AI is building your dashboard...</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Analyzing data, identifying KPIs, and generating charts. This might take a moment.</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;