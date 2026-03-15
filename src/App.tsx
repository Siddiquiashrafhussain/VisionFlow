import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Play, Square, Settings, LayoutDashboard, Activity, Terminal, CheckCircle2, CircleDashed, ArrowRight, Eye, MousePointer2, Keyboard, Search, Clock, Database, Server } from 'lucide-react';
import { auth, loginWithGoogle, logout, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'live' | 'tasks'>('dashboard');
  const [isRecording, setIsRecording] = useState(false);
  const [command, setCommand] = useState('');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'analyzing' | 'executing' | 'completed'>('idle');
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Real-time data state
  const [tasks, setTasks] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time data fetching
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
    }, (error) => {
      console.error("Error fetching tasks:", error);
    });

    const logsQuery = query(
      collection(db, 'actionLogs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllLogs(logsData);
    }, (error) => {
      console.error("Error fetching logs:", error);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeLogs();
    };
  }, [user, isAuthReady]);

  const startScreenCapture = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      return true;
    } catch (err) {
      console.error("Error sharing screen: ", err);
      setErrorMsg("Screen sharing permission was denied. Please allow screen sharing to use the Live Agent.");
      return false;
    }
  };

  const stopScreenCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Ensure video has dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.5); // Compress slightly
  };

  const handleStartTask = async () => {
    if (!command.trim()) return;
    
    setErrorMsg(null);
    if (!streamRef.current) {
      const started = await startScreenCapture();
      if (!started) return;
    }

    setAgentStatus('analyzing');
    setActiveTab('live');
    setActionLogs([]);
    
    try {
      // 1. Create Task in Firestore
      const taskRef = await addDoc(collection(db, 'tasks'), {
        sessionId: 'session-' + Date.now(),
        userId: user?.uid,
        description: command.substring(0, 990),
        status: 'in-progress',
        createdAt: serverTimestamp()
      });
      
      setCurrentTask({ id: taskRef.id, description: command });
      
      // 2. Capture Frame and Analyze
      const frameData = captureFrame();
      if (frameData) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              {
                inlineData: {
                  data: frameData.split(",")[1] || frameData,
                  mimeType: "image/jpeg",
                },
              },
              {
                text: `Analyze this screenshot. The user command is: "${command}". 
                What is the current state of the UI? What should be the next action?
                Format your response as JSON with the following structure:
                {
                  "analysis": "Brief description of what is on screen",
                  "nextAction": {
                    "type": "click|type|scroll|done",
                    "target": "Description of element to interact with",
                    "value": "Value to type (if type action)",
                    "reasoning": "Why this action is needed"
                  }
                }`,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                analysis: { type: Type.STRING },
                nextAction: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    target: { type: Type.STRING },
                    value: { type: Type.STRING },
                    reasoning: { type: Type.STRING }
                  },
                  required: ["type", "target", "reasoning"]
                }
              },
              required: ["analysis", "nextAction"]
            }
          }
        });
        
        const visionData = JSON.parse(response.text || "{}");
        
        const analysisLog = {
          taskId: taskRef.id,
          userId: user?.uid,
          actionType: 'analysis',
          target: 'screen',
          value: '',
          reasoning: (visionData.analysis || 'No analysis provided').substring(0, 990),
          screenshotUrl: '',
          createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'actionLogs'), analysisLog);
        
        setActionLogs(prev => [...prev, {
          id: Date.now().toString(),
          type: 'analysis',
          message: visionData.analysis,
          timestamp: new Date().toISOString()
        }]);

        if (visionData.nextAction) {
          setAgentStatus('executing');
          
          const actionLog = {
            taskId: taskRef.id,
            userId: user?.uid,
            actionType: (visionData.nextAction.type || 'unknown').substring(0, 90),
            target: (visionData.nextAction.target || '').substring(0, 490),
            value: (visionData.nextAction.value || '').substring(0, 990),
            reasoning: (visionData.nextAction.reasoning || '').substring(0, 990),
            screenshotUrl: '',
            createdAt: serverTimestamp()
          };
          
          await addDoc(collection(db, 'actionLogs'), actionLog);
          
          setActionLogs(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            type: 'action',
            action: visionData.nextAction,
            timestamp: new Date().toISOString()
          }]);
          
          // Simulate action execution
          setTimeout(async () => {
            setAgentStatus('completed');
            await updateDoc(doc(db, 'tasks', taskRef.id), {
              status: 'completed',
              result: 'Action executed successfully'
            });
            stopScreenCapture();
          }, 2000);
        } else {
          setAgentStatus('completed');
          await updateDoc(doc(db, 'tasks', taskRef.id), {
            status: 'completed',
            result: 'No further actions needed'
          });
          stopScreenCapture();
        }
      } else {
        await updateDoc(doc(db, 'tasks', taskRef.id), {
          status: 'failed',
          result: 'Failed to capture screen'
        });
        setAgentStatus('idle');
      }
    } catch (error: any) {
      console.error("Task error:", error);
      setErrorMsg(error.message || "An error occurred during the task.");
      setAgentStatus('idle');
      if (currentTask?.id) {
        await updateDoc(doc(db, 'tasks', currentTask.id), {
          status: 'failed',
          result: error.message
        }).catch(console.error);
      }
      stopScreenCapture();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full p-8 tech-panel rounded-xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded flex items-center justify-center mx-auto mb-6">
            <Eye className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-mono font-bold mb-2 tracking-wider uppercase text-primary">VisionFlow AI</h1>
          <p className="text-text-muted font-mono text-sm mb-8 uppercase tracking-widest">System Authentication</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full py-3 px-4 bg-surface-hover border border-border text-white font-mono text-sm uppercase tracking-wider rounded hover:bg-border transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Authenticate
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg-dark text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 border border-primary rounded flex items-center justify-center">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <span className="font-mono font-bold text-lg tracking-wider uppercase text-primary">VisionFlow</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-mono text-sm uppercase tracking-wider ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary border border-primary/30' : 'text-text-muted hover:bg-surface-hover hover:text-white border border-transparent'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('live')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-mono text-sm uppercase tracking-wider ${activeTab === 'live' ? 'bg-primary/10 text-primary border border-primary/30' : 'text-text-muted hover:bg-surface-hover hover:text-white border border-transparent'}`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Agent</span>
            {agentStatus !== 'idle' && agentStatus !== 'completed' && (
              <span className="w-2 h-2 rounded-full bg-primary ml-auto animate-pulse" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-mono text-sm uppercase tracking-wider ${activeTab === 'tasks' ? 'bg-primary/10 text-primary border border-primary/30' : 'text-text-muted hover:bg-surface-hover hover:text-white border border-transparent'}`}
          >
            <Terminal className="w-4 h-4" />
            <span>Task History</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-hover border border-border">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-8 h-8 rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-text-muted truncate">{user.displayName || user.email}</p>
            </div>
            <button onClick={logout} className="text-text-muted hover:text-white">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-surface z-10">
          <h2 className="text-lg font-mono uppercase tracking-wider text-text-muted">{activeTab.replace('-', ' ')}</h2>
          
          {/* Global Command Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative flex items-center">
              <div className="absolute left-4 text-primary">
                <Terminal className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartTask()}
                placeholder="> ENTER COMMAND..."
                className="w-full bg-bg-dark border border-border rounded-lg py-3 pl-12 pr-16 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm uppercase placeholder:text-text-muted/50"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button 
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-2 rounded transition-colors ${isRecording ? 'bg-red-500/20 text-red-500' : 'text-text-muted hover:text-white hover:bg-surface-hover'}`}
                >
                  {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button 
                  onClick={handleStartTask}
                  disabled={!command.trim() || agentStatus === 'analyzing' || agentStatus === 'executing'}
                  className="p-2 bg-primary/20 text-primary border border-primary/50 rounded hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="mx-8 mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 z-20 relative">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm font-medium">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="ml-auto hover:text-red-300">✕</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="tech-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">Total Tasks</h3>
                      <Database className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-3xl font-light font-mono">{tasks.length}</p>
                  </div>
                  <div className="tech-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">Success Rate</h3>
                      <Activity className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-light font-mono">
                      {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0}%
                    </p>
                  </div>
                  <div className="tech-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">Total Actions</h3>
                      <Terminal className="w-4 h-4 text-secondary" />
                    </div>
                    <p className="text-3xl font-light font-mono">{allLogs.length}</p>
                  </div>
                  <div className="tech-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">System Status</h3>
                      <Server className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <p className="text-sm font-mono text-primary">ONLINE</p>
                    </div>
                  </div>
                </div>

                <div className="tech-panel rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border bg-surface-hover flex items-center justify-between">
                    <h3 className="text-sm font-mono uppercase tracking-wider text-text-muted">Recent Activity Log</h3>
                    <Clock className="w-4 h-4 text-text-muted" />
                  </div>
                  
                  <div className="grid grid-cols-12 gap-4 p-3 border-b border-border bg-bg-dark text-xs font-mono text-text-muted uppercase tracking-wider">
                    <div className="col-span-2">Time</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-3">Target</div>
                    <div className="col-span-5">Reasoning</div>
                  </div>
                  
                  <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                    {allLogs.length === 0 ? (
                      <div className="p-8 text-center text-text-muted font-mono text-sm">No activity recorded yet.</div>
                    ) : (
                      allLogs.slice(0, 50).map((log) => (
                        <div key={log.id} className="grid grid-cols-12 gap-4 p-3 hover:bg-surface-hover transition-colors text-sm font-mono items-center">
                          <div className="col-span-2 text-text-muted text-xs">
                            {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                          </div>
                          <div className="col-span-2">
                            <span className={`px-2 py-1 rounded text-xs ${log.actionType === 'analysis' ? 'bg-blue-500/10 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                              {log.actionType}
                            </span>
                          </div>
                          <div className="col-span-3 truncate" title={log.target}>
                            {log.target || '-'}
                          </div>
                          <div className="col-span-5 truncate text-text-muted" title={log.reasoning}>
                            {log.reasoning}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'live' && (
              <motion.div 
                key="live"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex gap-6"
              >
                {/* Vision View */}
                <div className="flex-1 flex flex-col tech-panel rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-text-muted" />
                      <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Agent Vision</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {agentStatus !== 'idle' && (
                        <span className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`max-w-full max-h-full object-contain ${!streamRef.current ? 'hidden' : ''}`}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {!streamRef.current && (
                      <div className="text-center text-gray-500 flex flex-col items-center">
                        <Eye className="w-12 h-12 mb-4 opacity-20" />
                        <p>Waiting for screen share...</p>
                        <button 
                          onClick={startScreenCapture}
                          className="mt-4 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-hover text-sm"
                        >
                          Share Screen
                        </button>
                      </div>
                    )}
                    
                    {/* Overlay for executing state */}
                    {agentStatus === 'executing' && (
                      <div className="absolute inset-0 border-4 border-primary/50 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-primary rounded-full animate-ping" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Execution Panel */}
                <div className="w-96 flex flex-col tech-panel rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border bg-surface-hover">
                    <h3 className="text-sm font-mono uppercase tracking-wider text-text-muted">Execution Plan</h3>
                    <p className="text-xs font-mono text-primary mt-1">
                      {agentStatus === 'idle' ? '> SYSTEM READY' : 
                       agentStatus === 'analyzing' ? '> ANALYZING SCREEN...' :
                       agentStatus === 'executing' ? '> EXECUTING ACTIONS...' : '> TASK COMPLETED'}
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {actionLogs.length === 0 && agentStatus === 'idle' && (
                      <div className="text-center text-gray-500 py-12">
                        <Terminal className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No active task.</p>
                      </div>
                    )}
                    
                    {actionLogs.map((log) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={log.id} 
                        className="bg-bg-dark border border-border rounded-lg p-4 font-mono text-sm"
                      >
                        {log.type === 'analysis' ? (
                          <>
                            <div className="flex items-center gap-2 mb-2 text-blue-400">
                              <Eye className="w-4 h-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">Analysis</span>
                            </div>
                            <p className="text-xs text-text-muted leading-relaxed">{log.message}</p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2 text-primary">
                              {log.action.type === 'click' ? <MousePointer2 className="w-4 h-4" /> : 
                               log.action.type === 'type' ? <Keyboard className="w-4 h-4" /> : 
                               <Activity className="w-4 h-4" />}
                              <span className="text-xs font-bold uppercase tracking-wider">Action: {log.action.type}</span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex">
                                <span className="text-text-muted w-16">Target:</span>
                                <span className="text-gray-200">{log.action.target}</span>
                              </div>
                              {log.action.value && (
                                <div className="flex">
                                  <span className="text-text-muted w-16">Value:</span>
                                  <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">{log.action.value}</span>
                                </div>
                              )}
                              <div className="flex mt-2 pt-2 border-t border-border/50">
                                <span className="text-text-muted italic">{log.action.reasoning}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                    
                    {agentStatus === 'analyzing' && (
                      <div className="flex items-center gap-3 text-gray-400 p-4">
                        <CircleDashed className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Processing vision data...</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tasks' && (
              <motion.div 
                key="tasks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto"
              >
                <div className="tech-panel rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-border bg-surface-hover">
                    <h3 className="text-sm font-mono uppercase tracking-wider text-text-muted">Task History</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {tasks.length === 0 ? (
                      <div className="p-8 text-center text-text-muted font-mono text-sm">No tasks recorded yet.</div>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="p-6 flex items-center justify-between hover:bg-surface-hover transition-colors cursor-pointer">
                          <div>
                            <h4 className="font-medium mb-1">{task.description}</h4>
                            <p className="text-xs font-mono text-text-muted">
                              {task.createdAt?.toDate ? task.createdAt.toDate().toLocaleString() : 'Just now'} • {task.result || 'No result'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider ${
                              task.status === 'completed' ? 'bg-primary/10 text-primary' : 
                              task.status === 'failed' ? 'bg-red-500/10 text-red-500' : 
                              'bg-secondary/10 text-secondary'
                            }`}>
                              {task.status}
                            </span>
                            <ArrowRight className="w-4 h-4 text-text-muted" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
