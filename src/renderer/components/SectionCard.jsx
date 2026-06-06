import React, { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Play, Pause, ChevronDown, ChevronUp, Clock, Volume2 } from 'lucide-react'

export default function SectionCard({ section, activePlayingId, onPlayToggle }) {
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [duration, setDuration] = useState('00:00')

  const isActive = activePlayingId === section.section_number

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (!waveformRef.current) return

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'rgba(167, 139, 250, 0.2)',    // Light brand violet
      progressColor: '#818CF8',                  // Indigo progress
      cursorColor: 'rgba(255, 255, 255, 0.4)',
      cursorWidth: 2,
      height: 44,
      barWidth: 2,
      barGap: 3,
      barRadius: 4,
      responsive: true,
      normalize: true,
      fillParent: true
    })

    wavesurferRef.current = ws

    // Load file via custom media:// protocol
    const mediaUrl = `media://${section.audio_clip_path}`
    ws.load(mediaUrl)

    // Events
    ws.on('ready', () => {
      setDuration(formatTime(ws.getDuration()))
    })

    ws.on('timeupdate', () => {
      setCurrentTime(formatTime(ws.getCurrentTime()))
    })

    ws.on('play', () => {
      setIsPlaying(true)
    })

    ws.on('pause', () => {
      setIsPlaying(false)
    })

    ws.on('finish', () => {
      setIsPlaying(false)
      onPlayToggle(section.section_number, false) // Inform parent it finished
    })

    return () => {
      ws.destroy()
    }
  }, [section.audio_clip_path])

  // Sync wavesurfer playback state with active ID prop
  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws) return

    if (isActive && !ws.isPlaying()) {
      ws.play().catch(err => console.error("Playback failed:", err))
    } else if (!isActive && ws.isPlaying()) {
      ws.pause()
    }
  }, [isActive])

  const handlePlayClick = () => {
    const ws = wavesurferRef.current
    if (!ws) return

    if (ws.isPlaying()) {
      ws.pause()
      onPlayToggle(section.section_number, false)
    } else {
      onPlayToggle(section.section_number, true)
    }
  }

  return (
    <div className="glass-panel glass-panel-hover rounded-xl p-5 mb-5 flex flex-col transition-all duration-300 animate-slide-up">
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-accentViolet mb-1">
            Section {section.section_number}
          </div>
          <h3 className="text-lg font-bold text-slate-100 leading-snug">
            {section.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-accentIndigo/10 text-brand-accentIndigo rounded-full text-xs font-medium border border-brand-accentIndigo/20">
          <Clock className="w-3.5 h-3.5" />
          <span>{section.start_time} &rarr; {section.end_time}</span>
        </div>
      </div>

      {/* Summary Section (Default Front and Center) */}
      <div className="text-slate-300 text-sm leading-relaxed mb-5 bg-brand-darkBg/30 p-3 rounded-lg border border-white/[0.03]">
        {section.clean_summary}
      </div>

      {/* Audio Waveform and Controls */}
      <div className="flex items-center gap-4 bg-brand-darkBg/40 border border-white/[0.05] p-3 rounded-xl mb-4">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayClick}
          className="no-drag flex items-center justify-center w-10 h-10 bg-brand-accentViolet hover:bg-brand-accentViolet/90 text-brand-darkBg rounded-full transition-all duration-200 shadow-md hover:scale-105"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Waveform Visualization */}
        <div className="flex-1 min-w-0">
          <div ref={waveformRef} className="waveform-container w-full h-[44px]" />
        </div>

        {/* Time display */}
        <div className="text-right shrink-0">
          <div className="text-[10px] font-mono text-slate-400">
            {currentTime} / {duration}
          </div>
          <div className="flex justify-end mt-0.5 text-brand-accentViolet/60">
            <Volume2 className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Expandable Transcript Trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="no-drag flex items-center justify-between py-2 text-xs font-semibold text-brand-textMuted hover:text-slate-200 transition-colors w-full border-t border-white/[0.05]"
      >
        <span className="uppercase tracking-wider">Exact Words Spoken</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expandable Drawer Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-60 mt-3 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-brand-darkBg/60 text-slate-400 text-xs leading-relaxed font-mono p-4 rounded-lg border border-dashed border-white/10 overflow-y-auto max-h-48 select-text">
          &ldquo;{section.raw_transcript}&rdquo;
        </div>
      </div>
    </div>
  )
}
