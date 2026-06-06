const { app, BrowserWindow, ipcMain, protocol, net, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')
const { fileURLToPath } = require('url')
const ffmpegStatic = require('ffmpeg-static')
const { execFile } = require('child_process')
const {
  runTranscription,
  runSectionSplit,
  runSummarisation
} = require('./agentService')

// Register custom media protocol to safely load local clips without CORS warnings
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
])

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#090D16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Load app via Vite dev server or static distribution
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // Protocol handler for media://
  protocol.handle('media', (request) => {
    try {
      const filePath = fileURLToPath(request.url.replace('media://', 'file://'))
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (err) {
      console.error('Failed to handle media protocol:', err)
      return new Response('File not found', { status: 404 })
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handler: File Selection
ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['m4a', 'mp3', 'wav', 'ogg'] }
    ]
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

// IPC Handler: Processing Pipeline Execution
ipcMain.on('process-audio', async (event, filePath, settings) => {
  const sendProgress = (stepIndex, status, progressVal) => {
    event.sender.send('pipeline-progress', { stepIndex, status, progressVal })
  }

  try {
    console.log(`Starting audio processing pipeline for: ${filePath}`)
    
    // Create session workspace
    const sessionTimestamp = Date.now()
    const sessionDirName = `session_${sessionTimestamp}`
    const sessionsDir = path.join(__dirname, '../sessions')
    const sessionDir = path.join(sessionsDir, sessionDirName)
    
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true })
    }
    fs.mkdirSync(sessionDir)

    // Make sure we have the static ffmpeg binary path
    const ffmpegPath = ffmpegStatic
    const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe') // Usually alongside ffmpeg
    
    // Enrich settings with paths
    const enrichedSettings = {
      ...settings,
      ffmpegPath,
      ffprobePath
    }

    // STEP 1: Silence Trimming
    sendProgress(0, 'Trimming silence from raw audio...', 10)
    const trimmedAudioPath = path.join(sessionDir, 'trimmed_audio.mp3')
    
    // Remove silences (stop_periods=-1 means remove all quiet periods)
    // parameters: stop_duration (seconds), stop_threshold (dB)
    const silenceArgs = [
      '-y', // Overwrite output
      '-i', filePath,
      '-af', `silenceremove=stop_periods=-1:stop_duration=${settings.silenceDuration}:stop_threshold=${settings.silenceThreshold}dB`,
      trimmedAudioPath
    ]

    await new Promise((resolve, reject) => {
      execFile(ffmpegPath, silenceArgs, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`FFmpeg silence trim failed: ${error.message}\nStderr: ${stderr}`))
          return
        }
        resolve()
      })
    })

    // STEP 2: Speech Transcription (Codex CLI)
    sendProgress(1, 'Transcribing words and timestamps (Codex)...', 30)
    const transcription = await runTranscription(trimmedAudioPath, enrichedSettings, sessionDir)
    const { full_transcript, words } = transcription

    // STEP 3: Topic / Idea Section Splitting (Claude CLI)
    sendProgress(2, 'Identifying topic shifts and sections (Claude)...', 50)
    const sections = await runSectionSplit(full_transcript, words, enrichedSettings, sessionDir)

    // STEP 4: Cutting Section Audio Clips
    sendProgress(3, 'Slicing audio into logical section clips...', 70)
    const processedSections = []
    
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i]
      const clipName = `section_${sec.section_number}.mp3`
      const clipPath = path.join(sessionDir, clipName)
      
      // Cut audio command: -ss start_time -to end_time -i input -c copy output
      const cutArgs = [
        '-y',
        '-ss', sec.start_time,
        '-to', sec.end_time,
        '-i', trimmedAudioPath,
        '-c', 'copy',
        clipPath
      ]

      await new Promise((resolve, reject) => {
        execFile(ffmpegPath, cutArgs, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`FFmpeg slice for Section ${sec.section_number} failed: ${error.message}`))
            return
          }
          resolve()
        })
      })

      processedSections.push({
        ...sec,
        audio_clip_path: clipPath // Path inside filesystem
      })
    }

    // STEP 5: Generating Summaries (Claude CLI)
    sendProgress(4, 'Restructuring spoken ideas into clean summaries (Claude)...', 90)
    const finalSections = await runSummarisation(processedSections, enrichedSettings, sessionDir)

    // Cleanup instructions & temp files in session dir if not in debug mode
    try {
      const filesToCleanup = [
        'temp_transcript.json',
        'temp_split_instructions.txt',
        'temp_sections.json',
        'temp_sum_instructions.txt',
        'temp_sections_final.json'
      ]
      filesToCleanup.forEach(f => {
        const p = path.join(sessionDir, f)
        if (fs.existsSync(p)) fs.unlinkSync(p)
      })
    } catch (cleanErr) {
      console.warn("Failed to cleanup temporary pipeline files:", cleanErr)
    }

    // Final completion send
    sendProgress(4, 'Finished!', 100)
    event.sender.send('pipeline-complete', finalSections)

  } catch (err) {
    console.error('Pipeline Error:', err)
    event.sender.send('pipeline-error', err.message)
  }
})
