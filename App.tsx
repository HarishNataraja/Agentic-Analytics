import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MessageInput from './components/MessageInput';
// --- AUTHENTICATION DISABLED ---
// import LoginPage from './components/auth/LoginPage';
// import SignupPage from './components/auth/SignupPage';
// import * as authService from './services/authService';
// --- END AUTHENTICATION DISABLED ---
import DashboardView from './components/dashboard/DashboardView';
import PresentationWorkspace from './components/presentation/PresentationWorkspace';
import PresentationPlayer from './components/presentation/PresentationPlayer';
import { Agent, Message, AspectRatio, ChartData, User, DashboardItem, Presentation, Slide, SlideObject } from './types';
import * as geminiService from './services/geminiService';
import { readFileContent } from './utils/fileUtils';
import { createPcmBlob, decode, decodeAudioData } from './utils/audioUtils';
// Fix: Remove `LiveSession` from imports as it's not exported from @google/genai.
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
// Fix: Import 'ChatWindow' to resolve 'Cannot find name 'ChatWindow''.
import ChatWindow from './components/ChatWindow';

const MAX_DATA_CONTEXT_LENGTH = 500000; // 500k chars is a safe limit for the API context window

const App: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState<Agent>(Agent.DATA_ANALYSIS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [presentationMessages, setPresentationMessages] = useState<Message[]>([]);

  const [dataContext, setDataContext] = useState<string | null>(null);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");

  // --- AUTHENTICATION DISABLED ---
  const [user, setUser] = useState<User | null>({ id: 'dev-user', email: 'developer@example.com' });
  // --- END AUTHENTICATION DISABLED ---

  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
  
  const [presentationHistory, setPresentationHistory] = useState<Presentation[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const presentation = presentationHistory[historyIndex];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < presentationHistory.length - 1;

  const [isPresentationLoading, setIsPresentationLoading] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);

  const liveSessionRef = useRef<geminiService.LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextAudioStartTimeRef = useRef<number>(0);
  const currentTranscriptionRef = useRef({ input: '', output: '' });
  
  const handleSetPresentation = (newPresentation: Presentation, newHistoryEntry = true) => {
    if (newHistoryEntry) {
        const newHistory = presentationHistory.slice(0, historyIndex + 1);
        setPresentationHistory([...newHistory, newPresentation]);
        setHistoryIndex(newHistory.length);
    } else {
        const newHistory = [...presentationHistory];
        newHistory[historyIndex] = newPresentation;
        setPresentationHistory(newHistory);
    }
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

  const handleLogout = () => {
    console.log("Logout is temporarily disabled. Reloading page.");
    window.location.reload();
  };

  const handleAgentChange = (agent: Agent) => {
    setActiveAgent(agent);
    setMessages([]);
    setPresentationMessages([]);
    setDataContext(null);
    setIsPresenting(false); 
    
    if(agent === Agent.PRESENTATION && !presentation) {
        const blankPresentation = geminiService.createBlankPresentation();
        setPresentationHistory([blankPresentation]);
        setHistoryIndex(0);
    } else if (agent !== Agent.PRESENTATION) {
        setPresentationHistory([]);
        setHistoryIndex(-1);
    }
  };
  
  const handleSaveToDashboard = (chartData: ChartData, title: string) => {
    const newItem: DashboardItem = {
      id: `dash-${Date.now()}`,
      type: 'chart',
      title: title.split('\n')[0], 
      data: chartData
    };
    setDashboardItems(prev => [...prev, newItem]);
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
    const userMessage: Message = { 
        id: Date.now().toString(), 
        sender: 'user', 
        text: prompt,
        fileInfo: file ? { name: file.name } : undefined
    };
    
    // Handle presentation agent separately
    if (activeAgent === Agent.PRESENTATION) {
        setPresentationMessages(prev => [...prev, userMessage]);
        const botMessageId = (Date.now() + 1).toString();
        const loadingMessage: Message = { id: botMessageId, sender: 'bot', isLoading: true };
        setPresentationMessages(prev => [...prev, loadingMessage]);

        try {
            const updatedPresentation = await geminiService.editPresentation(prompt, presentation);
            handleSetPresentation(updatedPresentation);
            setPresentationMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isLoading: false, text: "Done! I've updated the presentation." } : m));
        } catch(error) {
            console.error("Error editing presentation:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setPresentationMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isLoading: false, text: `Sorry, I couldn't make that change: ${errorMessage}` } : m));
        }
        return;
    }


    let messagesToAdd: Message[] = [userMessage];
    let contextForPrompt: string | null = null;
    
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
            return;
        }
    } else {
        contextForPrompt = dataContext;
    }

    setMessages(prev => [...prev, ...messagesToAdd]);

    const botMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = { id: botMessageId, sender: 'bot', isLoading: true, isThinking: isThinkingMode };
    setMessages(prev => [...prev, loadingMessage]);

    try {
        let response;
        let promptForApi = prompt;
        let systemInstructionForApi = "";

        const hasDataContext = !!contextForPrompt;

        if (hasDataContext && !prompt.trim()) {
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
            const chartInstructions = `You are an expert Data Analyst AI...`; // (rest of prompt)
            const generalChatInstruction = "You are a friendly and helpful AI assistant...";
            systemInstructionForApi = hasDataContext ? chartInstructions : generalChatInstruction;
            if (contextForPrompt) {
                promptForApi = `Data context:\n\`\`\`\n${contextForPrompt}\n\`\`\`\n\nUser query: ${prompt}`;
            }
        }

        response = await geminiService.generateText(promptForApi, isThinkingMode, systemInstructionForApi);
        processAndDisplayResponse(response.text, botMessageId, response.sources);
        
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`, isLoading: false } : m));
    }
  };

  const startVoice = useCallback(async () => { /* ... */ }, [isVoiceRecording]);
  const stopVoice = useCallback(() => { /* ... */ }, [isVoiceRecording]);

  useEffect(() => {
      return () => {
          if(isVoiceRecording) stopVoice();
      }
  }, [isVoiceRecording, stopVoice]);
  
  const renderMainContent = () => {
    const suggestions = [
      "Upload a CSV and find correlations",
      "Explain the key insights from my data file",
      "Create a bar chart of sales by region",
      "Summarize this dataset for me"
    ];

    switch(activeAgent) {
        case Agent.DASHBOARD:
            return <DashboardView items={dashboardItems} />;
        case Agent.PRESENTATION:
            if (isPresenting && presentation) {
                return <PresentationPlayer presentation={presentation} onExit={() => setIsPresenting(false)} />
            }
            if (presentation) {
                return <PresentationWorkspace 
                            presentation={presentation}
                            dashboardItems={dashboardItems}
                            onPresentationChange={handleSetPresentation}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onPresent={() => setIsPresenting(true)}
                            messages={presentationMessages}
                            onSendMessage={handleSendMessage}
                        />;
            }
            return null; // Should not happen with the new logic
        case Agent.DATA_ANALYSIS:
        default:
            return (
                <div className="flex-1 flex flex-col">
                    <ChatWindow 
                        messages={messages} 
                        onSaveToDashboard={handleSaveToDashboard}
                        suggestions={suggestions}
                        onSuggestionClick={(prompt) => handleSendMessage(prompt)}
                    />
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
                </div>
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