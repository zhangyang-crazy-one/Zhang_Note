


import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MarkdownFile, ViewMode, AppTheme, AIConfig, AIState, ChatMessage, 
  GraphData, Quiz, NoteLayoutItem, AppShortcut, RAGStats, SearchResult 
} from './types';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { ChatPanel } from './components/ChatPanel';
import { AISettingsModal } from './components/AISettingsModal';
import { SearchModal } from './components/SearchModal';
import { QuestionBankModal } from './components/QuestionBankModal';
import { SmartOrganizeModal } from './components/SmartOrganizeModal';
import { SmartSaveModal } from './components/SmartSaveModal';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { NoteSpace } from './components/NoteSpace';
import { LibraryView } from './components/LibraryView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { QuizPanel } from './components/QuizPanel';
import { MindMap } from './components/MindMap';
import { DiffView } from './components/DiffView';
import { LoginScreen } from './components/LoginScreen';

import { 
  generateAIResponse, 
  polishContent, 
  expandContent, 
  generateMindMap, 
  generateQuiz, 
  enhanceUserPrompt, 
  extractEntitiesAndRelationships,
  suggestTags,
  compactConversation
} from './services/aiService';
import { 
  readDirectory, 
  saveFileToDisk, 
  extractTextFromFile, 
  parseCsvToQuiz, 
  parseJsonToQuiz 
} from './services/fileService';
import { 
  generateFileLinkGraph, 
  buildKnowledgeIndex 
} from './services/knowledgeService';
import { 
    getAllThemes, 
    getSavedThemeId, 
    applyTheme, 
    saveCustomTheme, 
    deleteCustomTheme 
} from './services/themeService';
import { VectorStore } from './services/ragService';

const DEFAULT_FILE: MarkdownFile = {
  id: 'welcome-note',
  name: 'Welcome',
  content: '# Welcome to Neon Note\n\nStart typing or ask the AI for help!',
  lastModified: Date.now()
};

function App() {
  // --- State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requireLogin, setRequireLogin] = useState(() => localStorage.getItem('neon-require-login') === 'true');
  
  const [files, setFiles] = useState<MarkdownFile[]>(() => {
    try {
      const saved = localStorage.getItem('neon-files');
      return saved ? JSON.parse(saved) : [DEFAULT_FILE];
    } catch { return [DEFAULT_FILE]; }
  });
  
  const [activeFileId, setActiveFileId] = useState<string>(() => {
      return localStorage.getItem('neon-active-file-id') || files[0]?.id || '';
  });

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Editor);
  const [isSplitView, setIsSplitView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  
  const [themeId, setThemeId] = useState(getSavedThemeId());
  const [themes, setThemes] = useState<AppTheme[]>(getAllThemes());

  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const saved = localStorage.getItem('neon-ai-config');
    return saved ? JSON.parse(saved) : {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: '',
      temperature: 0.7,
      language: 'en'
    };
  });

  const [aiState, setAiState] = useState<AIState>({ isThinking: false, error: null, message: null });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Modals & Overlays
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [questionBankOpen, setQuestionBankOpen] = useState(false);
  const [smartOrganizeOpen, setSmartOrganizeOpen] = useState(false);
  const [smartSaveOpen, setSmartSaveOpen] = useState(false);
  
  // Specific View States
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [mindMapContent, setMindMapContent] = useState('');
  const [noteLayout, setNoteLayout] = useState<Record<string, NoteLayoutItem>>({});
  const [ragStats, setRagStats] = useState<RAGStats | undefined>(undefined);

  const vectorStore = useRef(new VectorStore());

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem('neon-files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('neon-active-file-id', activeFileId);
  }, [activeFileId]);

  useEffect(() => {
    localStorage.setItem('neon-ai-config', JSON.stringify(aiConfig));
  }, [aiConfig]);

  useEffect(() => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) applyTheme(theme);
  }, [themeId, themes]);

  // Indexing Effect
  useEffect(() => {
    const indexFiles = async () => {
        if (!aiConfig.apiKey && aiConfig.provider === 'gemini') return;
        
        let indexedCount = 0;
        for (const file of files) {
            await vectorStore.current.indexFile(file, aiConfig);
            indexedCount++;
            setRagStats(prev => ({
                totalFiles: files.length,
                indexedFiles: indexedCount,
                totalChunks: vectorStore.current.getStats().totalChunks,
                isIndexing: true
            }));
        }
        setRagStats(prev => ({ ...prev!, isIndexing: false }));
    };
    // Debounce indexing to avoid thrashing on every keystroke
    const timer = setTimeout(indexFiles, 3000);
    return () => clearTimeout(timer);
  }, [files, aiConfig]);

  // --- Helpers ---

  const activeFile = useMemo(() => files.find(f => f.id === activeFileId) || files[0], [files, activeFileId]);

  const updateFile = (id: string, content: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, content, lastModified: Date.now() } : f));
  };

  const createItem = (type: 'file' | 'folder', name: string, parentPath: string) => {
      if (type === 'file') {
          const newFile: MarkdownFile = {
              id: `file-${Date.now()}`,
              name: name.endsWith('.md') ? name : `${name}.md`,
              content: '',
              lastModified: Date.now(),
              path: parentPath
          };
          setFiles(prev => [...prev, newFile]);
          setActiveFileId(newFile.id);
          // If created in split view, could auto-open, but simple select is fine
      } else {
          // Create a .keep file to persist folder
          const keepFile: MarkdownFile = {
              id: `keep-${Date.now()}`,
              name: '.keep',
              content: '',
              lastModified: Date.now(),
              path: parentPath ? `${parentPath}/${name}` : name
          };
          setFiles(prev => [...prev, keepFile]);
      }
  };

  const deleteFile = (id: string) => {
      if (confirm('Are you sure you want to delete this file?')) {
          setFiles(prev => prev.filter(f => f.id !== id));
          if (activeFileId === id) {
              setActiveFileId(files.find(f => f.id !== id)?.id || '');
          }
      }
  };

  const handleImportFile = async (file: File) => {
      const content = await extractTextFromFile(file, aiConfig.apiKey);
      const newFile: MarkdownFile = {
          id: `import-${Date.now()}`,
          name: file.name,
          content,
          lastModified: file.lastModified
      };
      setFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
  };

  const handleImportQuiz = async (file: File) => {
     // .md files can now be quizzes if they contain the JSON structure (Smart Saved exams)
     const isJsonOrMd = file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.md');
     const quiz = isJsonOrMd 
        ? await parseJsonToQuiz(file)
        : await parseCsvToQuiz(file);
        
     if (quiz) {
         setActiveQuiz(quiz);
         setViewMode(ViewMode.Quiz);
     } else {
         alert("Failed to parse quiz file. Ensure it contains a valid quiz structure.");
     }
  };

  // --- AI Actions ---

  const handleSendMessage = async (text: string) => {
      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
      setMessages(prev => [...prev, userMsg]);
      setAiState({ isThinking: true, error: null, message: null });

      try {
          const ragContext = await vectorStore.current.search(text, aiConfig);
          const response = await generateAIResponse(
              text, 
              aiConfig, 
              "You are a helpful assistant.", 
              false, 
              [activeFile],
              undefined, // Tool callback
              ragContext
          );
          
          const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: response, timestamp: Date.now() };
          setMessages(prev => [...prev, aiMsg]);
      } catch (e: any) {
          setAiState({ isThinking: false, error: e.message, message: null });
      } finally {
          setAiState(prev => ({ ...prev, isThinking: false }));
      }
  };

  const handleAIPolish = async () => {
      setAiState({ isThinking: true, error: null, message: "Polishing content..." });
      try {
          const polished = await polishContent(activeFile.content, aiConfig);
          updateFile(activeFileId, polished);
      } catch (e: any) {
          setAiState({ isThinking: false, error: e.message, message: null });
      } finally {
          setAiState({ isThinking: false, error: null, message: null });
      }
  };

  const handleAIExpand = async () => {
      setAiState({ isThinking: true, error: null, message: "Expanding content..." });
      try {
          const expanded = await expandContent(activeFile.content, aiConfig);
          updateFile(activeFileId, expanded);
      } catch (e: any) {
          setAiState({ isThinking: false, error: e.message, message: null });
      } finally {
          setAiState({ isThinking: false, error: null, message: null });
      }
  };

  const handleGenerateMindMap = async () => {
      setAiState({ isThinking: true, error: null, message: "Generating Mind Map..." });
      try {
          const code = await generateMindMap(activeFile.content, aiConfig);
          setMindMapContent(code);
          setViewMode(ViewMode.MindMap);
      } catch (e: any) {
          setAiState({ isThinking: false, error: e.message, message: null });
      } finally {
          setAiState({ isThinking: false, error: null, message: null });
      }
  };

  const handleBuildGraph = () => {
      const data = generateFileLinkGraph(files);
      setGraphData(data);
      setViewMode(ViewMode.Graph);
  };

  const handleSmartSaveConfirm = (tags: string[]) => {
      const tagString = tags.map(t => `#${t}`).join(' ');
      const newContent = `${activeFile.content}\n\n${tagString}`;
      updateFile(activeFileId, newContent);
      setSmartSaveOpen(false);
  };

  const handleAddToQuestionBank = () => {
      if (!activeQuiz) return;
      
      try {
          const existingBankStr = localStorage.getItem('neon-question-bank');
          const existingBank: any[] = existingBankStr ? JSON.parse(existingBankStr) : [];
          
          let addedCount = 0;
          const newQuestions = activeQuiz.questions.filter(q => {
              const exists = existingBank.some(eq => eq.question === q.question);
              if (!exists) addedCount++;
              return !exists;
          });
          
          if (addedCount > 0) {
              const updatedBank = [...existingBank, ...newQuestions];
              localStorage.setItem('neon-question-bank', JSON.stringify(updatedBank));
              alert(`Successfully added ${addedCount} questions to the Question Bank.`);
          } else {
              alert("No new unique questions to add.");
          }
      } catch (e) {
          console.error("Failed to add to bank", e);
          alert("Failed to save to Question Bank.");
      }
  };

  // --- Render ---

  if (requireLogin && !isAuthenticated) {
      return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
      switch (viewMode) {
          case ViewMode.Graph:
              return <KnowledgeGraph data={graphData} theme={themeId === 'neon-cyber' ? 'dark' : 'light'} onNodeClick={(id) => { if(files.find(f=>f.id===id)) { setActiveFileId(id); setViewMode(ViewMode.Editor); } }} onCloseCustomGraph={() => setViewMode(ViewMode.Editor)} />;
          case ViewMode.MindMap:
              return <MindMap content={mindMapContent} theme={themeId === 'neon-cyber' ? 'dark' : 'light'} language={aiConfig.language} />;
          case ViewMode.Quiz:
              return activeQuiz ? <QuizPanel quiz={activeQuiz} aiConfig={aiConfig} theme={themeId === 'neon-cyber' ? 'dark' : 'light'} onClose={() => setViewMode(ViewMode.Editor)} contextContent={activeFile.content} language={aiConfig.language} onAddToBank={handleAddToQuestionBank} /> : <div>No Quiz Active</div>;
          case ViewMode.NoteSpace:
              return <NoteSpace files={files} activeFileId={activeFileId} onSelectFile={setActiveFileId} layout={noteLayout} onLayoutChange={setNoteLayout} theme={themeId === 'neon-cyber' ? 'dark' : 'light'} />;
          case ViewMode.Library:
              return <LibraryView files={files} onSelectFile={(id) => { setActiveFileId(id); setViewMode(ViewMode.Editor); }} activeFileId={activeFileId} />;
          case ViewMode.Analytics:
              return <AnalyticsDashboard files={files} onNavigate={(id) => { setActiveFileId(id); setViewMode(ViewMode.Editor); }} language={aiConfig.language} />;
          case ViewMode.Split:
              // For simplicity in this fix, we render Editor and Preview side-by-side
              return (
                  <div className="flex h-full">
                      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
                          <Editor content={activeFile.content} onChange={(val) => updateFile(activeFileId, val)} />
                      </div>
                      <div className="w-1/2">
                          <Preview content={activeFile.content} files={files} onNavigate={setActiveFileId} />
                      </div>
                  </div>
              );
          case ViewMode.Editor:
          default:
              return <Editor content={activeFile.content} onChange={(val) => updateFile(activeFileId, val)} />;
      }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${themeId === 'neon-cyber' ? 'dark' : ''} bg-white dark:bg-gray-900 text-slate-900 dark:text-slate-100`}>
        <Sidebar 
            files={files}
            activeFileId={activeFileId}
            onSelectFile={(id) => { setActiveFileId(id); setViewMode(ViewMode.Editor); }}
            onCreateItem={createItem}
            onDeleteFile={deleteFile}
            onMoveItem={(src, dest) => { /* Implement move */ }}
            onRenameItem={(id, name) => setFiles(prev => prev.map(f => f.id === id ? { ...f, name } : f))}
            isOpen={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
            onOpenFolder={async () => { /* Folder open logic */ }}
            onImportFile={handleImportFile}
            onImportQuiz={handleImportQuiz}
            language={aiConfig.language}
            ragStats={ragStats}
            onRefreshIndex={() => { /* Trigger re-index */ }}
            onInsertSnippet={(text) => updateFile(activeFileId, activeFile.content + text)}
            onGenerateExam={() => setQuestionBankOpen(true)}
        />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Toolbar 
                viewMode={viewMode}
                setViewMode={setViewMode}
                onClear={() => updateFile(activeFileId, '')}
                onExport={() => saveFileToDisk(activeFile)}
                onAIPolish={handleAIPolish}
                onAIExpand={handleAIExpand}
                onAIEntityExtraction={async () => {
                    const data = await extractEntitiesAndRelationships(activeFile.content, aiConfig);
                    setGraphData(data);
                    setViewMode(ViewMode.Graph);
                }}
                onBuildGraph={handleBuildGraph}
                onSynthesize={() => {/* Synthesize logic */}}
                onGenerateMindMap={handleGenerateMindMap}
                onGenerateQuiz={() => setQuestionBankOpen(true)}
                onFormatBold={() => { /* Bold */ }}
                onFormatItalic={() => { /* Italic */ }}
                isAIThinking={aiState.isThinking}
                theme={themeId === 'neon-cyber' ? 'dark' : 'light'}
                toggleTheme={() => { /* Basic toggle for now, Settings has full selection */ }}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                toggleChat={() => setChatOpen(!chatOpen)}
                toggleSettings={() => setSettingsOpen(true)}
                fileName={activeFile.name}
                onRename={(name) => setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, name } : f))}
                activeProvider={aiConfig.provider}
                language={aiConfig.language}
                isSplitView={isSplitView}
                onToggleSplitView={() => setIsSplitView(!isSplitView)}
                onSmartOrganize={() => setSmartOrganizeOpen(true)}
                onSmartSave={() => setSmartSaveOpen(true)}
            />
            
            <div className="flex-1 overflow-hidden relative">
                {renderContent()}
                
                {/* Modals */}
                <AISettingsModal 
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    config={aiConfig}
                    onSave={setAiConfig}
                    themes={themes}
                    activeThemeId={themeId}
                    onSelectTheme={setThemeId}
                    onImportTheme={(t) => { setThemes(p => [...p, t]); saveCustomTheme(t); }}
                    onDeleteTheme={(id) => { setThemes(p => p.filter(t => t.id !== id)); deleteCustomTheme(id); }}
                    language={aiConfig.language}
                    isLoginEnabled={requireLogin}
                    onToggleLogin={(enabled) => { setRequireLogin(enabled); localStorage.setItem('neon-require-login', String(enabled)); }}
                />
                
                <SearchModal 
                    isOpen={searchOpen}
                    onClose={() => setSearchOpen(false)}
                    files={files}
                    onNavigate={(id) => { setActiveFileId(id); setViewMode(ViewMode.Editor); }}
                    aiConfig={aiConfig}
                    semanticSearch={(q, c) => vectorStore.current.semanticSearch(q, c)}
                    relatedFilesProvider={(id) => vectorStore.current.findRelatedFiles(id)}
                />
                
                <QuestionBankModal 
                    isOpen={questionBankOpen}
                    onClose={() => setQuestionBankOpen(false)}
                    activeFile={activeFile}
                    aiConfig={aiConfig}
                    onStartQuiz={(qs, cfg) => { 
                        setActiveQuiz({ id: `q-${Date.now()}`, title: 'Generated Quiz', description: '', questions: qs, isGraded: false, config: cfg });
                        setViewMode(ViewMode.Quiz); 
                    }}
                />
                
                <SmartOrganizeModal 
                    isOpen={smartOrganizeOpen}
                    onClose={() => setSmartOrganizeOpen(false)}
                    file={activeFile}
                    allFiles={files}
                    aiConfig={aiConfig}
                    onApplyTags={(tags) => { /* Apply tags logic */ }}
                    onMoveFile={(path) => { /* Move logic */ }}
                    onInsertLink={(target) => updateFile(activeFileId, activeFile.content + `\n[[${target}]]`)}
                    onUpdateMetadata={(score, concepts) => { /* Update metadata */ }}
                    findRelatedFiles={(id) => vectorStore.current.findRelatedFiles(id)}
                    onOpenSettings={() => setSettingsOpen(true)}
                />
                
                <SmartSaveModal 
                    isOpen={smartSaveOpen}
                    onClose={() => setSmartSaveOpen(false)}
                    onConfirm={handleSmartSaveConfirm}
                    initialTags={[]} 
                    isAnalyzing={false}
                    language={aiConfig.language}
                />
            </div>
            
            <ChatPanel 
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                messages={messages}
                onSendMessage={handleSendMessage}
                onClearChat={() => setMessages([])}
                aiState={aiState}
                language={aiConfig.language}
                onEnhancePrompt={(text) => enhanceUserPrompt(text, messages, aiConfig, "")}
            />
        </div>
    </div>
  );
}

export default App;