import React, { useState, useEffect } from 'react'
import { 
  FileAudio, 
  UploadCloud, 
  Settings, 
  Play, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ToggleLeft, 
  ToggleRight,
  Database,
  Cpu
} from 'lucide-react'
import SectionCard from './components/SectionCard'

const PIPELINE_STEPS = [
  { label: 'Silence Trimming', description: 'Removing dead silence from audio via FFmpeg' },
  { label: 'Codex Transcription', description: 'Transcribing speech with word-level timestamps' },
  { label: 'Claude Section Split', description: 'Grouping raw thoughts into logical topic blocks' },
  { label: 'FFmpeg Audio Slicing', description: 'Cutting original audio into section-specific clips' },
  { label: 'Claude Summarization', description: 'Refining sections into structured, readable summaries' }
]

export default function App() {
  const [filePath, setFilePath] = useState(null)
  const [fileName, setFileName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Pipeline status states
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [stepStatus, setStepStatus] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [errorMsg, setErrorMsg] = useState(null)
  
  // Result state
  const [sections, setSections] = useState(null)
  const [activePlayingId, setActivePlayingId] = useState(null)
  
  // Settings & Toggles
  const [showSettings, setShowSettings] = useState(false)
  const [useMock, setUseMock] = useState(true) // Defaults to Mock Mode for initial run/test
  const [silenceThreshold, setSilenceThreshold] = useState(-30)
  const [silenceDuration, setSilenceDuration] = useState(0.5)
  const [codexCommand, setCodexCommand] = useState('codex transcribe "${audioPath}"')
  const [claudeCommand, setClaudeCommand] = useState('claude')

  // Setup IPC listeners
  useEffect(() => {
    // Listen to progress updates
    const removeProgressListener = window.api.onProgress((data) => {
      setCurrentStepIndex(data.stepIndex)
      setStepStatus(data.status)
      setProgressPercent(data.progressVal)
    })

    // Listen to complete event
    const removeCompleteListener = window.api.onComplete((finalSections) => {
      setSections(finalSections)
      setIsProcessing(false)
    })

    // Listen to error event
    const removeErrorListener = window.api.onError((err) => {
      setErrorMsg(err)
      setIsProcessing(false)
    })

    return () => {
      removeProgressListener()
      removeCompleteListener()
      removeErrorListener()
    }
  }, [])

  const handleSelectFile = async () => {
    setErrorMsg(null)
    const selectedPath = await window.api.selectAudioFile()
    if (selectedPath) {
      setFilePath(selectedPath)
      setFileName(selectedPath.split('/').pop())
    }
  }

  const handleStartProcess = () => {
    if (!filePath) return
    
    setErrorMsg(null)
    setSections(null)
    setIsProcessing(true)
    setCurrentStepIndex(0)
    setProgressPercent(5)
    setStepStatus('Initializing pipeline...')

    // Trigger process via IPC main
    window.api.processAudio(filePath, {
      useMock,
      silenceThreshold,
      silenceDuration,
      codexCommand,
      claudeCommand
    })
  }

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    setErrorMsg(null)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const ext = file.name.split('.').pop().toLowerCase()
      if (['m4a', 'mp3', 'wav', 'ogg'].includes(ext)) {
        setFilePath(file.path)
        setFileName(file.name)
      } else {
        setErrorMsg('Unsupported file format. Please drop M4A, MP3, WAV, or OGG.')
      }
    }
  }

  const handlePlayToggle = (sectionNumber, isPlaying) => {
    if (isPlaying) {
      setActivePlayingId(sectionNumber)
    } else if (activePlayingId === sectionNumber) {
      setActivePlayingId(null)
    }
  }

  const handleReset = () => {
    setFilePath(null)
    setFileName('')
    setSections(null)
    setActivePlayingId(null)
    setErrorMsg(null)
  }

  return (
    <div className="flex flex-col h-screen select-none bg-brand-darkBg text-slate-100 relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-glowViolet opacity-30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand-glowIndigo opacity-20 blur-[150px] pointer-events-none" />

      {/* Top Header/Window Control Space */}
      <header className="drag-bar h-14 border-b border-white/[0.05] flex items-center justify-between px-6 shrink-0 z-10 glass-panel">
        <div className="flex items-center gap-3 no-drag">
          <Sparkles className="w-5 h-5 text-brand-accentViolet animate-pulse-glow" />
          <span className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-brand-accentViolet to-brand-accentIndigo bg-clip-text text-transparent uppercase">
            Voice-O-Extractor
          </span>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4 no-drag">
          {/* Active Mode Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/[0.08] rounded-full text-xs font-semibold">
            {useMock ? (
              <>
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400/90">Mock Mode Active</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400/90">Live Terminal CLIs</span>
              </>
            )}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-start z-10">
        
        {/* Error Alert */}
        {errorMsg && (
          <div className="w-full max-w-2xl p-4 mb-6 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-200 animate-slide-up">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div className="text-xs">
              <div className="font-bold mb-1">Processing Error</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {/* State 1: File Selection Dropzone */}
        {!filePath && !isProcessing && !sections && (
          <div className="w-full max-w-2xl flex-1 flex flex-col justify-center py-12 animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
                Restructure Your Raw Thoughts
              </h1>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Drop your messy voice memos or recordings and get back neat, organized, and playable idea-based cards.
              </p>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleSelectFile}
              className={`glass-panel rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                isDragOver
                  ? 'border-brand-accentViolet bg-brand-accentViolet/5 scale-[1.01] shadow-[0_0_30px_rgba(139,92,246,0.15)]'
                  : 'border-white/10 hover:border-brand-accentViolet/60 hover:bg-white/[0.01]'
              }`}
            >
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-brand-accentViolet rounded-full filter blur-xl opacity-30 animate-pulse-glow" />
                <UploadCloud className="relative w-12 h-12 text-brand-accentViolet" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1.5">
                Drag & drop voice recording here
              </p>
              <p className="text-xs text-brand-textMuted mb-4">
                Supports M4A, MP3, WAV, OGG (up to 200MB)
              </p>
              <button className="px-4 py-2 bg-white/5 border border-white/10 text-xs font-semibold rounded-lg hover:bg-white/10 transition-colors">
                Browse Files
              </button>
            </div>
          </div>
        )}

        {/* State 2: File Ingested / Ready to Process */}
        {filePath && !isProcessing && !sections && (
          <div className="w-full max-w-xl my-auto glass-panel rounded-2xl p-6 border border-white/10 animate-fade-in">
            <div className="flex items-center gap-4 bg-brand-darkBg/60 p-4 rounded-xl border border-white/[0.03] mb-6">
              <div className="w-12 h-12 bg-brand-accentViolet/10 text-brand-accentViolet rounded-xl flex items-center justify-center border border-brand-accentViolet/20 shrink-0">
                <FileAudio className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-brand-accentViolet uppercase tracking-wider mb-0.5">Selected Recording</div>
                <div className="text-sm font-bold truncate text-slate-200">{fileName}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{filePath}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold rounded-xl transition-all"
              >
                Choose Another
              </button>
              <button
                onClick={handleStartProcess}
                className="flex-[2] py-3 bg-brand-accentViolet hover:bg-brand-accentViolet/90 text-brand-darkBg text-xs font-bold rounded-xl transition-all shadow-md hover:scale-[1.01]"
              >
                Extract Ideas
              </button>
            </div>
          </div>
        )}

        {/* State 3: Pipeline Processing Status */}
        {isProcessing && (
          <div className="w-full max-w-xl my-auto animate-fade-in">
            <div className="glass-panel rounded-2xl p-6 border border-white/10 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-brand-accentViolet animate-spin" />
                  <span className="text-sm font-bold text-slate-200">Processing Audio File...</span>
                </div>
                <span className="text-xs font-mono text-brand-accentViolet font-semibold">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-brand-darkBg rounded-full overflow-hidden mb-6 border border-white/[0.03]">
                <div 
                  className="h-full bg-gradient-to-r from-brand-accentViolet to-brand-accentIndigo rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="text-xs text-brand-textMuted bg-brand-darkBg/50 p-3 rounded-lg border border-white/[0.03] font-mono leading-relaxed">
                <span className="text-brand-accentViolet">Status: </span>
                {stepStatus}
              </div>
            </div>

            {/* Stepper Pipeline Visualization */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
              {PIPELINE_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex
                const isActive = idx === currentStepIndex
                
                return (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-4 transition-all duration-300 ${
                      isActive ? 'opacity-100 scale-[1.01]' : isCompleted ? 'opacity-80' : 'opacity-30'
                    }`}
                  >
                    {/* Circle Indicator */}
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-accentViolet fill-brand-accentViolet/10" />
                      ) : isActive ? (
                        <div className="w-5 h-5 rounded-full border-2 border-brand-accentViolet flex items-center justify-center animate-pulse">
                          <div className="w-2 h-2 rounded-full bg-brand-accentViolet" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-white/15" />
                      )}
                    </div>

                    <div>
                      <div className={`text-xs font-bold ${isActive ? 'text-brand-accentViolet' : 'text-slate-200'}`}>
                        {step.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {step.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* State 4: Cards Display Dashboard */}
        {sections && !isProcessing && (
          <div className="w-full max-w-4xl animate-fade-in flex flex-col h-full">
            {/* Header info */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <button
                onClick={handleReset}
                className="no-drag flex items-center gap-1.5 text-xs font-semibold text-brand-accentViolet hover:text-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Process Another File</span>
              </button>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">Total Extracted Ideas: </span>
                <span className="text-xs font-bold text-brand-accentViolet">{sections.length}</span>
              </div>
            </div>

            {/* List of cards */}
            <div className="flex-1 overflow-y-auto pr-1">
              {sections.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 my-12">
                  <FileAudio className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-slate-200 mb-1">No Ideas Found</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    The processing pipeline succeeded, but no logical topic sections could be extracted.
                  </p>
                </div>
              ) : (
                sections.map((sec) => (
                  <SectionCard
                    key={sec.section_number}
                    section={sec}
                    activePlayingId={activePlayingId}
                    onPlayToggle={handlePlayToggle}
                  />
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* Slide-out Settings Panel */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 bg-brand-darkBg/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 transition-all duration-300 transform ${
          showSettings ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Pipeline Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs font-semibold text-brand-accentViolet hover:text-slate-100"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1 text-xs">
            {/* Mock Mode Toggle */}
            <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-200">Execution Mode</span>
                <button
                  onClick={() => setUseMock(!useMock)}
                  className="text-brand-accentViolet focus:outline-none"
                >
                  {useMock ? (
                    <ToggleRight className="w-9 h-9 text-brand-accentViolet" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-500" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Toggle between Mock Mode (full offline fallback generation) and Live CLI execution (calls terminal commands 'codex' and 'claude').
              </p>
            </div>

            {/* Silence Parameters */}
            <div className="flex flex-col gap-3.5">
              <span className="font-bold text-slate-300">Silence Trimming (FFmpeg)</span>
              
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Threshold</span>
                  <span className="font-mono text-slate-200">{silenceThreshold} dB</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="-10"
                  value={silenceThreshold}
                  onChange={(e) => setSilenceThreshold(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-accentViolet"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Minimum Duration</span>
                  <span className="font-mono text-slate-200">{silenceDuration} s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={silenceDuration}
                  onChange={(e) => setSilenceDuration(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-accentViolet"
                />
              </div>
            </div>

            {/* CLI Command Settings */}
            <div className="flex flex-col gap-3.5 mt-2">
              <span className="font-bold text-slate-300">CLI Commands Config</span>
              
              <div>
                <label className="block text-slate-400 mb-1">Codex Transcription Command</label>
                <input
                  type="text"
                  value={codexCommand}
                  onChange={(e) => setCodexCommand(e.target.value)}
                  className="w-full bg-brand-darkBg/60 text-slate-200 border border-white/10 p-2.5 rounded-lg font-mono focus:border-brand-accentViolet outline-none"
                  disabled={useMock}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Claude Code Command</label>
                <input
                  type="text"
                  value={claudeCommand}
                  onChange={(e) => setClaudeCommand(e.target.value)}
                  className="w-full bg-brand-darkBg/60 text-slate-200 border border-white/10 p-2.5 rounded-lg font-mono focus:border-brand-accentViolet outline-none"
                  disabled={useMock}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
