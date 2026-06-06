# Voice-O-Extractor

Voice-O-Extractor is a premium personal desktop application designed for macOS. It takes your raw, unstructured voice memos and processes them through a multi-step local pipeline to extract, slice, and structure your ideas into clean, readable cards.

---

## 🎯 Features & Pipeline Flow
1. **Silence Trimming**: Automatically strips complete silences from your audio files using FFmpeg (`silenceremove` filter).
2. **Speech Transcription**: Passes the cleaned audio to your local **Codex CLI** to generate a word-level transcript with timestamps.
3. **Idea-Based Section Splitting**: Uses your local **Claude Code CLI** to group related thoughts into cohesive, topic-based sections with title and timestamps.
4. **Audio Slicing**: FFmpeg cuts the original audio file into individual playable clips matching each section's start and end times.
5. **Summarization**: Passes each section to **Claude** to rewrite it with better sentence structure while preserving your original words and phrasing.
6. **Card Dashboard**: Renders each section as a beautiful frosted card with interactive waveform visualizers (WaveSurfer.js), playback controls, summaries, and collapsible raw transcript drawers.

---

## ⚙️ Prerequisites
This application is designed for **macOS** and integrates with terminal CLI tools:
- **Codex CLI**: A global `codex` command available in your terminal.
- **Claude Code CLI**: A global `claude` command available in your terminal.
- **FFmpeg**: Automatically bundled inside the application via `ffmpeg-static` (no installation required).

*Note: If you do not have Codex or Claude CLIs installed or authenticated on a testing machine, you can toggle **Mock Mode** in the app's settings. Mock Mode generates realistic mock data based on the actual audio file duration, letting you test the entire app offline.*

---

## 🚀 Step-by-Step Run Instructions

Open your terminal in the root of the project directory and run the following commands:

### Step 1: Set Up the Local Node.js Environment
Since Node.js/npm may not be installed globally on your machine, we package a local installer. Run:
```bash
./install-node.sh
```
This detects your architecture (Apple Silicon vs Intel) and downloads/extracts a localized Node.js environment into the `./node-env` folder.

### Step 2: Load the Local Environment
Prepend the local Node path to your terminal session:
```bash
export PATH="$(pwd)/node-env/bin:$PATH"
```
*(Verify by running `node -v` and `npm -v` to ensure they execute successfully).*

### Step 3: Install Dependencies
Install the required Electron, React, Vite, and audio processing npm packages:
```bash
npm install
```

### Step 4: Run in Development Mode
Launch the application:
```bash
npm run dev
```
This compiles the application assets using Vite, runs hot-reloading for the React UI, and spawns the Electron desktop window.

---

## 🛠️ Pipeline Configurations (Settings Drawer)
Click the **Settings Cog (⚙️)** in the top-right corner of the application to adjust:
* **Execution Mode**: Toggle between **Mock Mode** (full offline testing) and **Live Terminal CLIs** (runs `codex` and `claude` CLI commands).
* **Silence Threshold**: The volume limit (in dB, e.g. `-30dB`) under which audio is treated as silence.
* **Minimum Silence Duration**: The minimum time (in seconds, e.g. `0.5s`) of continuous quiet required to trigger silence trimming.
* **CLI Templates**: Customize the exact CLI syntax executed in your terminal (e.g. `codex transcribe "${audioPath}"` and `claude`).