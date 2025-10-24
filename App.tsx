import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
// --- AUTHENTICATION DISABLED ---
// import LoginPage from './components/auth/LoginPage';
// import SignupPage from './components/auth/SignupPage';
// import * as authService from './services/authService';
// --- END AUTHENTICATION DISABLED ---
import DashboardView from './components/dashboard/DashboardView';
import PresentationEditor from './components/presentation/PresentationEditor';
import PresentationPlayer from './components/presentation/PresentationPlayer';
import { Agent, Message, AspectRatio, ChartData, User, DashboardItem, Presentation, Slide, SlideObject } from './types';
import * as geminiService from './services/geminiService';
import { readFileContent, toBase64 } from './utils/fileUtils';
import { createPcmBlob, decode, decodeAudioData } from './utils/audioUtils';
// Fix: Remove `LiveSession` from imports as it's not exported from @google/genai.
import { GoogleGenAI, LiveServerMessage } from '@google/genai';

const MAX_DATA_CONTEXT_LENGTH = 500000; // 500k chars is a safe limit for the API context window

const App: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState<Agent>(Agent.DATA_ANALYSIS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dataContext, setDataContext] = useState<string | null>(null);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");

  // --- AUTHENTICATION DISABLED ---
  // A mock user is set to bypass the login screen during development.
  const [user, setUser] = useState<User | null>({ id: 'dev-user', email: 'developer@example.com' });
  // const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');
  // const [authError, setAuthError] = useState<string>('');
  // const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  // --- END AUTHENTICATION DISABLED ---

  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
  
  // Presentation state with history for undo/redo
  const [presentationHistory, setPresentationHistory] = useState<Presentation[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const presentation = presentationHistory[historyIndex];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < presentationHistory.length - 1;

  const [isPresentationLoading, setIsPresentationLoading] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);

  // Fix: Use the `LiveSession` type defined in `geminiService`.
  const liveSessionRef = useRef<geminiService.LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextAudioStartTimeRef = useRef<number>(0);
  const currentTranscriptionRef = useRef({ input: '', output: '' });

  // --- AUTHENTICATION DISABLED ---
  // useEffect(() => {
  //   const currentUser = authService.getCurrentUser();
  //   if (currentUser) {
  //     setUser(currentUser);
  //   }
  // }, []);
  // --- END AUTHENTICATION DISABLED ---
  
  const handleSetPresentation = (newPresentation: Presentation) => {
    const newHistory = presentationHistory.slice(0, historyIndex + 1);
    setPresentationHistory([...newHistory, newPresentation]);
    setHistoryIndex(newHistory.length);
  };
  
  const handleUndo = () => {
      if(canUndo) {
          setHistoryIndex(historyIndex - 1);
      }
  };
  
  const handleRedo = () => {
      if(canRedo) {
          setHistoryIndex(historyIndex + 1);
      }
  };

  // --- AUTHENTICATION DISABLED ---
  // const handleLogin = async (email: string, password: string) => {
  //   setIsAuthLoading(true);
  //   setAuthError('');
  //   try {
  //     const loggedInUser = await authService.login(email, password);
  //     setUser(loggedInUser);
  //   } catch (error) {
  //     setAuthError(error instanceof Error ? error.message : 'An unknown error occurred.');
  //   } finally {
  //     setIsAuthLoading(false);
  //   }
  // };

  // const handleSignup = async (email: string, password: string) => {
  //   setIsAuthLoading(true);
  //   setAuthError('');
  //   try {
  //     const newUser = await authService.signup(email, password);
  //     setUser(newUser);
  //   } catch (error)
  //   {
  //     setAuthError(error instanceof Error ? error.message : 'An unknown error occurred.');
  //   } finally {
  //     setIsAuthLoading(false);
  //   }
  // };

  const handleLogout = () => {
    // authService.logout();
    // setUser(null);
    console.log("Logout is temporarily disabled. Reloading page.");
    window.location.reload();
  };
  // --- END AUTHENTICATION DISABLED ---

  const handleAgentChange = (agent: Agent) => {
    setActiveAgent(agent);
    setMessages([]);
    setDataContext(null);
    setIsPresenting(false); // Exit presentation mode when changing agents
    if(agent !== Agent.PRESENTATION) {
        setPresentationHistory([]);
        setHistoryIndex(-1);
    }
  };
  
  const handleSaveToDashboard = (chartData: ChartData, title: string) => {
    const newItem: DashboardItem = {
      id: `dash-${Date.now()}`,
      type: 'chart',
      title: title.split('\n')[0], // Use first line of text as title
      data: chartData
    };
    setDashboardItems(prev => [...prev, newItem]);
    // Optional: add a confirmation message
    const confirmationMsg: Message = {
      id: Date.now().toString(),
      sender: 'bot',
      text: `Chart "${newItem.title}" saved to dashboard.`
    };
    setMessages(prev => [...prev, confirmationMsg]);
  };

  const processAndDisplayResponse = (responseText: string, messageId: string, sources?: any[]) => {
      const jsonRegex = /```json\n([\s\S]*?)\n```/;
      const match = responseText.match(jsonRegex);

      if (match && activeAgent === Agent.DATA_ANALYSIS) {
          try {
              const chartData: ChartData = JSON.parse(match[1]);
              const textPart = responseText.replace(jsonRegex, '').trim();
              setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: textPart, chart: chartData, isLoading: false, sources } : m));
          } catch (e) {
              console.error("Failed to parse chart JSON:", e);
              setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: responseText, isLoading: false, sources } : m));
          }
      } else {
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: responseText, isLoading: false, sources } : m));
      }
  }


  const handleSendMessage = async (prompt: string, file?: File) => {
    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: prompt };
    if (file && activeAgent === Agent.DATA_ANALYSIS) {
        userMessage.image = URL.createObjectURL(file);
    }
    
    let messagesToAdd: Message[] = [userMessage];
    
    // Handle context and potential truncation
    let contextForPrompt: string | null = null;
    if (activeAgent === Agent.DATA_ANALYSIS) {
        if (file) {
            try {
                let fileContent = await readFileContent(file);
                if (fileContent.length > MAX_DATA_CONTEXT_LENGTH) {
                    fileContent = fileContent.substring(0, MAX_DATA_CONTEXT_LENGTH);
                    messagesToAdd.push({
                        id: Date.now().toString() + "-truncation",
                        sender: 'bot',
                        text: `(Note: The uploaded file is very large. To proceed, only the beginning of the file will be analyzed.)`
                    });
                }
                setDataContext(fileContent);
                contextForPrompt = fileContent;
            } catch (error) {
                 console.error("Error reading file:", error);
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    sender: 'bot',
                    text: `Sorry, I couldn't read the file. It might be corrupted or in an unsupported format. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
                setMessages(prev => [...prev, userMessage, errorMessage]);
                return; // Stop processing
            }
        } else {
            contextForPrompt = dataContext;
        }
    }

    setMessages(prev => [...prev, ...messagesToAdd]);

    // Handle presentation agent separately
    if (activeAgent === Agent.PRESENTATION) {
        setIsPresentationLoading(true);
        try {
            let dashboardContext = dashboardItems.length > 0 
                ? `The user has these items saved to their dashboard, which may be relevant:\n${dashboardItems.map(item => `- ${item.title}`).join('\n')}`
                : "The user's dashboard is currently empty.";
            
            // Safeguard against excessively long dashboard context
            if (dashboardContext.length > 10000) {
              dashboardContext = dashboardContext.substring(0, 10000) + "\n...";
            }

            const presentationPrompt = `You are an expert presentation creator AI. Your task is to generate a structured presentation in JSON format based on the user's topic and the provided dashboard context.

**Instructions:**
1.  **Create a Narrative**: Develop a logical narrative flow for the presentation. Start with a strong title slide, followed by content slides that build upon each other, and end with a concluding thought if appropriate.
2.  **Use the Context**: If the dashboard context is provided, use the titles of the charts and insights to inform the content and structure of your slides. The presentation should feel like a summary or extension of the user's existing analysis.
3.  **Be Concise**: Each content slide must have a clear title and a few key bullet points. Avoid jargon and keep the text professional and easy to understand.
4.  **Strict JSON Output**: The final output must be *only* the JSON object, conforming to the provided schema. Do not include any other text or explanations.

**Dashboard Context:**
${dashboardContext}

**User's Topic:** "${prompt}"`;
            
            const generatedPresentation = await geminiService.generatePresentation(presentationPrompt);
            setPresentationHistory([generatedPresentation]);
            setHistoryIndex(0);
        } catch(error) {
            console.error("Error generating presentation:", error);
            const errorPresentation = geminiService.createErrorPresentation(
              "Presentation Generation Failed",
              error instanceof Error ? error.message : "An unknown error occurred."
            );
            setPresentationHistory([errorPresentation]);
            setHistoryIndex(0);
        } finally {
            setIsPresentationLoading(false);
        }
        return;
    }

    const botMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = { id: botMessageId, sender: 'bot', isLoading: true, isThinking: isThinkingMode };
    setMessages(prev => [...prev, loadingMessage]);

    try {
        let response;
        let promptForApi = prompt;
        let systemInstructionForApi = "";

        switch (activeAgent) {
            case Agent.DATA_ANALYSIS:
                const hasDataContext = !!contextForPrompt;

                if (hasDataContext && !prompt.trim()) {
                    // This is the new logic for automatic EDA on file upload
                    promptForApi = `The user has just uploaded a dataset. Perform a comprehensive, automatic Exploratory Data Analysis (EDA).
Follow these steps and structure your response exactly as described:
1.  **Data Overview**: Provide a brief summary of the dataset. Mention the number of rows and columns, and list the column names with their inferred data types (e.g., numerical, categorical, date).
2.  **Initial Findings & Missing Values**: Describe any immediate observations. Report the number and percentage of missing values for each column.
3.  **Suggested EDA Steps**: Propose a numbered list of 3-5 specific questions the user could ask to explore this data further. These should be insightful questions that could lead to interesting visualizations or discoveries. For example: "What is the distribution of values in the 'price' column?" or "How does 'category' relate to 'sales'?".
4.  **Recommended Visualizations**: Based on the data, suggest a list of suitable chart types (e.g., histogram, bar chart, scatter plot) that would be effective for analysis.

IMPORTANT: Do not generate any charts or JSON in this initial analysis. Your entire response should be text-based markdown. Your goal is to give the user a comprehensive starting point and guide them on what to ask next.

Data content:
\`\`\`
${contextForPrompt}
\`\`\`
`;
                    systemInstructionForApi = `You are a helpful and proactive Data Analysis AI. Your goal is to perform an automatic, comprehensive EDA on the user's uploaded dataset to give them a great starting point for their analysis.`;
                } else {
                    const chartInstructions = `You are an expert Data Analyst AI. Your primary goal is to analyze the provided data context based on the user's query. The data context is a string that could be in any format (like CSV, JSON, or unstructured text). Do your best to parse it and extract meaningful information. If you cannot understand the format, please state that clearly in your response.
Follow these steps:
1.  **Analyze and Summarize**: First, provide a clear, concise text-based analysis. Identify key trends, outliers, correlations, or important summaries in the data that directly answer the user's question. Start with the most important finding.
2.  **Generate a Visualization (If Appropriate)**: Second, if and only if a visualization significantly enhances the analysis, generate a SINGLE, appropriate chart. The chart must directly support a key finding from your text analysis. Do not generate a chart for simple requests that don't require one.
**Chart Selection Guide:**
*   **Bar Chart**: Use for comparing values across different categories.
*   **Line Chart**: Use for showing trends over time or a continuous sequence.
*   **Pie Chart**: Use for showing parts of a whole (use sparingly, for few categories).
*   **Scatter Plot**: Use for showing the relationship or correlation between two numerical variables.
*   **Box Plot**: Use for showing the distribution of numerical data across categories.
*   **Heatmap**: Use for visualizing the magnitude of a phenomenon between two discrete variables (e.g., correlation matrix).
**Output Format:**
Your text analysis must come first. If you generate a chart, it must be enclosed in a \`\`\`json block immediately after your text. The JSON object must be the *only* thing inside the block and must conform strictly to one of the following schemas:
-   **Bar Chart**: \`{ "type": "bar", "data": [{ "name": "category", "value": 10 }], "dataKey": "value", "nameKey": "name" }\`
-   **Line Chart**: \`{ "type": "line", "data": [{ "name": "point", "value": 10 }], "dataKey": "value", "nameKey": "name" }\`
-   **Pie Chart**: \`{ "type": "pie", "data": [{ "name": "slice", "value": 10 }], "dataKey": "value", "nameKey": "name" }\`
-   **Scatter Plot**: \`{ "type": "scatter", "data": [{ "x": 10, "y": 20 }], "xKey": "x", "yKey": "y", "xAxisLabel": "X-Axis Title", "yAxisLabel": "Y-Axis Title" }\`
-   **Box Plot**: \`{ "type": "boxplot", "data": [{ "name": "Group A", "box": [min, q1, median, q3, max] }], "yAxisLabel": "Value Title" }\`
-   **Heatmap**: \`{ "type": "heatmap", "xLabels": ["Var1"], "yLabels": ["Metric A"], "data": [{ "x": "Var1", "y": "Metric A", "value": 85 }] }\`
Do not add any conversational text before or after your analysis and optional chart block.`;
                    
                    const generalChatInstruction = "You are a friendly and helpful AI assistant for the Agentic Analytics Platform. Answer the user's questions concisely. If the user asks about a feature, explain it simply. Avoid making up information about the platform's capabilities.";
                    
                    systemInstructionForApi = hasDataContext ? chartInstructions : generalChatInstruction;

                    if (contextForPrompt) {
                        promptForApi = `Data context:\n\`\`\`\n${contextForPrompt}\n\`\`\`\n\nUser query: ${prompt}`;
                    }
                }

                response = await geminiService.generateText(promptForApi, isThinkingMode, systemInstructionForApi);
                processAndDisplayResponse(response.text, botMessageId, response.sources);
                break;
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`, isLoading: false } : m));
    }
  };

  const startVoice = useCallback(async () => {
    if (isVoiceRecording) return;
    setIsVoiceRecording(true);
    setMessages([]);
    
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    nextAudioStartTimeRef.current = 0;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStreamRef.current = stream;

    const sessionPromise = geminiService.startLiveSession({
        onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, outputAudioContextRef.current.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                source.start(nextAudioStartTimeRef.current);
                nextAudioStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.inputTranscription) {
                currentTranscriptionRef.current.input += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
                currentTranscriptionRef.current.output += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
                setMessages(prev => [...prev, {
                    id: `turn-${Date.now()}`,
                    sender: 'bot',
                    transcript: { type: 'input', text: currentTranscriptionRef.current.input },
                }, {
                    id: `turn-${Date.now()+1}`,
                    sender: 'bot',
                    transcript: { type: 'output', text: currentTranscriptionRef.current.output }
                }]);
                currentTranscriptionRef.current = { input: '', output: '' };
            }
        },
        onerror: (e) => console.error("Live session error:", e),
        onclose: () => console.log("Live session closed."),
    });

    liveSessionRef.current = await sessionPromise;
    
    if (inputAudioContextRef.current && audioStreamRef.current) {
        const source = inputAudioContextRef.current.createMediaStreamSource(audioStreamRef.current);
        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
        };
        source.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
    }
  }, [isVoiceRecording]);

  const stopVoice = useCallback(() => {
    if (!isVoiceRecording) return;
    liveSessionRef.current?.close();
    audioStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    audioSourcesRef.current.forEach(source => source.stop());

    liveSessionRef.current = null;
    audioStreamRef.current = null;
    scriptProcessorRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    audioSourcesRef.current.clear();

    setIsVoiceRecording(false);
  }, [isVoiceRecording]);

  useEffect(() => {
      return () => {
          if(isVoiceRecording) stopVoice();
      }
  }, [isVoiceRecording, stopVoice]);

  // --- AUTHENTICATION DISABLED ---
  // The login/signup screen logic is removed to always show the app.
  // if (!user) {
  //   if (authPage === 'login') {
  //     return (
  //       <LoginPage 
  //         onLogin={handleLogin} 
  //         onSwitchToSignup={() => { setAuthPage('signup'); setAuthError(''); }}
  //         error={authError}
  //         isLoading={isAuthLoading}
  //       />
  //     );
  //   } else {
  //     return (
  //       <SignupPage 
  //         onSignup={handleSignup} 
  //         onSwitchToLogin={() => { setAuthPage('login'); setAuthError(''); }}
  //         error={authError}
  //         isLoading={isAuthLoading}
  //       />
  //     );
  //   }
  // }
  // --- END AUTHENTICATION DISABLED ---
  
  const renderMainContent = () => {
    switch(activeAgent) {
        case Agent.DASHBOARD:
            return <DashboardView items={dashboardItems} />;
        case Agent.PRESENTATION:
            if (isPresenting && presentation) {
                return <PresentationPlayer presentation={presentation} onExit={() => setIsPresenting(false)} />
            }
            return (
                <div className="flex-1 flex flex-col">
                    {presentation ? (
                         <PresentationEditor 
                            initialPresentation={presentation}
                            dashboardItems={dashboardItems}
                            onPresentationChange={handleSetPresentation}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onPresent={() => setIsPresenting(true)}
                         />
                    ) : (
                        <div className="flex-1 flex flex-col">
                            {isPresentationLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <p>Generating your presentation...</p>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center p-8">
                                    <div className="text-center max-w-lg">
                                        <h2 className="text-2xl font-semibold mb-2">Create a new Presentation</h2>
                                        <p className="text-gray-500 mb-4">Describe the topic of your presentation, and our AI will generate a starting outline and slides for you to edit.</p>
                                    </div>
                                </div>
                            )}
                            <MessageInput 
                                onSendMessage={handleSendMessage} 
                                agent={activeAgent}
                                // Pass other necessary props
                                isThinking={false} onThinkingChange={()=>{}} isVoiceRecording={false} aspectRatio={"1:1"} onAspectRatioChange={()=>{}}
                            />
                        </div>
                    )}
                </div>
            );
        case Agent.DATA_ANALYSIS:
        default:
            return (
                <>
                    <ChatWindow messages={messages} onSaveToDashboard={activeAgent === Agent.DATA_ANALYSIS ? handleSaveToDashboard : undefined} />
                    <MessageInput 
                      onSendMessage={handleSendMessage} 
                      agent={activeAgent} 
                      isThinking={isThinkingMode}
                      onThinkingChange={setIsThinkingMode}
                      isVoiceRecording={isVoiceRecording}
                      onVoiceRecordStart={startVoice}
                      onVoiceRecordStop={stopVoice}
                      aspectRatio={aspectRatio}
                      onAspectRatioChange={setAspectRatio}
                    />
                </>
            );
    }
  };


  return (
    <div className="flex h-screen font-sans text-gray-900 dark:text-gray-100">
      <Sidebar activeAgent={activeAgent} onAgentChange={handleAgentChange} user={user} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900/80">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;