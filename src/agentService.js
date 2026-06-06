const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')

/**
 * Execute a shell command inside a macOS login shell (zsh -l)
 * to inherit user terminal configuration and credentials.
 */
function runCommandInShell(command, cwd) {
  return new Promise((resolve, reject) => {
    // Run command in a login shell to load ~/.zshrc profile
    const shellCommand = `/bin/zsh -l -c ${JSON.stringify(command)}`
    
    exec(shellCommand, { cwd, env: { ...process.env } }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`))
        return
      }
      resolve(stdout)
    })
  })
}

/**
 * Get audio file duration using ffprobe.
 */
function getAudioDuration(filePath, ffprobePath) {
  return new Promise((resolve, reject) => {
    if (ffprobePath) {
      ffmpeg.setFfprobePath(ffprobePath)
    }
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }
      resolve(metadata.format.duration || 0)
    })
  })
}

/**
 * Helper to convert seconds to hh:mm:ss format
 */
function secondsToHHMMSS(sec) {
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = Math.floor(sec % 60)
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':')
}

/**
 * Generate high-quality mock transcription data based on file duration.
 */
function generateMockTranscript(duration) {
  const wordsList = [
    "okay", "so", "today", "I", "wanted", "to", "brainstorm", "some", "ideas", "for", "the",
    "voice", "extractor", "app", "basically", "the", "core", "concept", "is", "a", "personal",
    "desktop", "utility", "where", "I", "can", "just", "dump", "my", "raw", "voice", "memos",
    "and", "then", "let", "the", "pipeline", "organize", "everything", "into", "logical", "cards",
    "the", "architecture", "should", "be", "electron", "with", "react", "and", "tailwind", "css",
    "because", "I", "want", "it", "to", "look", "super", "premium", "and", "highly", "polished",
    "so", "like", "frosted", "glass", "vibrant", "gradients", "and", "micro-animations",
    "now", "moving", "on", "to", "the", "processing", "pipeline", "we", "will", "use", "ffmpeg",
    "to", "trim", "silence", "this", "is", "super", "important", "so", "that", "the", "sections",
    "are", "tight", "and", "we", "don't", "waste", "time", "listening", "to", "dead", "air",
    "then", "we", "can", "send", "the", "cleaned", "audio", "to", "the", "codex", "agent", "for",
    "transcribing", "everything", "with", "word-level", "timestamps", "and", "once", "we",
    "have", "that", "we", "use", "claude", "to", "split", "it", "into", "sensible", "topics",
    "for", "example", "if", "I", "talk", "about", "frontend", "then", "jump", "to", "database",
    "and", "then", "go", "back", "to", "frontend", "claude", "should", "group", "the", "thoughts",
    "together", "into", "cohesive", "theme-based", "cards", "which", "is", "awesome",
    "finally", "for", "each", "card", "we", "will", "cut", "an", "audio", "clip", "and",
    "have", "claude", "write", "a", "summarized", "version", "that", "reads", "well", "but",
    "keeps", "my", "original", "intent", "and", "tone", "untouched"
  ]

  const words = []
  let currentTime = 1.2
  
  // Distribute words over the duration
  let wordIdx = 0
  while (currentTime < duration - 2) {
    const word = wordsList[wordIdx % wordsList.length]
    const wordDuration = 0.25 + Math.random() * 0.35
    const end = currentTime + wordDuration
    
    words.push({
      word,
      start: parseFloat(currentTime.toFixed(2)),
      end: parseFloat(end.toFixed(2))
    })
    
    // Increment time (some words have small pauses)
    currentTime = end + (Math.random() < 0.15 ? 0.3 : 0.05)
    wordIdx++
  }

  const full_transcript = words.map(w => w.word).join(' ')
  return { full_transcript, words }
}

/**
 * Step 3: Transcription (Codex Agent)
 */
async function runTranscription(audioPath, settings, tempDir) {
  if (settings.useMock) {
    const duration = await getAudioDuration(audioPath, settings.ffprobePath)
    return generateMockTranscript(duration)
  }

  // CLI Command template execution
  const cmd = settings.codexCommand.replace('${audioPath}', audioPath)
  console.log(`Executing Codex CLI: ${cmd}`)
  
  const stdout = await runCommandInShell(cmd, tempDir)
  
  // Extract JSON from output (in case CLI prints logs around the JSON)
  const jsonMatch = stdout.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Failed to extract JSON from Codex CLI output:\n${stdout}`)
  }
  
  return JSON.parse(jsonMatch[0])
}

/**
 * Step 4: Section Splitting (Claude Code Agent)
 */
async function runSectionSplit(fullTranscript, words, settings, tempDir) {
  if (settings.useMock) {
    // Generate mock split sections based on transcript
    const totalDuration = words[words.length - 1]?.end || 30
    const sectionCount = Math.max(1, Math.min(3, Math.floor(totalDuration / 30)))
    const sections = []
    
    const wordsPerSection = Math.floor(words.length / sectionCount)
    
    const titles = [
      "Project Overview and Design Vision",
      "Silence Trimming and FFmpeg Pipeline",
      "Multi-Agent Workflow Integration"
    ]
    
    for (let i = 0; i < sectionCount; i++) {
      const startIdx = i * wordsPerSection
      const endIdx = i === sectionCount - 1 ? words.length : (i + 1) * wordsPerSection
      const secWords = words.slice(startIdx, endIdx)
      
      const startTimeSec = secWords[0]?.start || 0
      const endTimeSec = secWords[secWords.length - 1]?.end || totalDuration
      
      sections.push({
        section_number: i + 1,
        title: titles[i % titles.length],
        start_time: secondsToHHMMSS(startTimeSec),
        end_time: secondsToHHMMSS(endTimeSec),
        raw_transcript: secWords.map(w => w.word).join(' ')
      })
    }
    
    return sections
  }

  // 1. Write transcript to temp file
  const transcriptPath = path.join(tempDir, 'temp_transcript.json')
  fs.writeFileSync(transcriptPath, JSON.stringify({ full_transcript: fullTranscript, words }, null, 2))
  
  // 2. Write splitting instructions
  const instructionsPath = path.join(tempDir, 'temp_split_instructions.txt')
  const instructions = `You are an expert idea extraction assistant specialising in unstructured spoken transcripts.
Task: Split the transcript into logical idea-based sections.

Steps to complete task:
1) Read the entire transcript in temp_transcript.json before splitting anything.
2) Identify natural topic or idea shifts.
3) Group related thoughts into one section even if the speaker returned to the topic later.
4) Assign each section a short clear title.
5) Record exact start and end timestamps per section (format: "hh:mm:ss").
6) Write the output as a valid JSON array of section objects to "temp_sections.json" in the current directory.
7) Return ONLY the JSON array. Do not write any explanations or Markdown code blocks in the file.

Format Output:
[
  {
    "section_number": 1,
    "title": "Short idea title",
    "start_time": "00:00:12",
    "end_time": "00:02:45",
    "raw_transcript": "Exact words spoken..."
  }
]`
  fs.writeFileSync(instructionsPath, instructions)

  // 3. Run Claude CLI
  const cmd = `${settings.claudeCommand} -p "Read temp_transcript.json, split it into logical sections, and save the result as a raw JSON array to temp_sections.json. Follow the rules in temp_split_instructions.txt. Do not write any explanations, just write the JSON file." --bare --permission-mode auto`
  console.log(`Executing Claude CLI (Split): ${cmd}`)
  
  await runCommandInShell(cmd, tempDir)

  // 4. Read output sections
  const outputPath = path.join(tempDir, 'temp_sections.json')
  if (!fs.existsSync(outputPath)) {
    throw new Error("Claude CLI finished but temp_sections.json was not created.")
  }

  const sectionsContent = fs.readFileSync(outputPath, 'utf8')
  // Strip any markdown code fences if Claude mistakenly wrote them
  const jsonString = sectionsContent.replace(/```json|```/g, '').trim()
  return JSON.parse(jsonString)
}

/**
 * Step 6: Summarisation (Claude Code Agent)
 */
async function runSummarisation(sections, settings, tempDir) {
  if (settings.useMock) {
    // Generate mock summaries
    const mockSummaries = [
      "The speaker introduces the core vision of Voice-O-Extractor, emphasizing a premium desktop Electron application built with React and Tailwind CSS. The app aims to provide a beautiful, local workspace with frosted glass styling and micro-animations for compiling raw voice thoughts into organized cards.",
      "The discussion shifts to the technical backend pipeline. FFmpeg will be utilized to perform aggressive silence trimming (-30dB threshold, 0.5s duration) to ensure sections are tight, after which the audio will undergo word-level transcript matching.",
      "The speaker details how Claude Code will orchestrate the transcript analysis. Claude will identify shift markers in conversation, bundle related themes back together even if spoken out of order, and generate summarized versions of each section clip."
    ]

    return sections.map((sec, idx) => ({
      ...sec,
      clean_summary: mockSummaries[idx % mockSummaries.length],
      audio_clip_path: '' // Will be populated by the cutting step
    }))
  }

  // 1. Write current sections to temp file
  const sectionsPath = path.join(tempDir, 'temp_sections.json')
  fs.writeFileSync(sectionsPath, JSON.stringify(sections, null, 2))

  // 2. Write summarization instructions
  const instructionsPath = path.join(tempDir, 'temp_sum_instructions.txt')
  const instructions = `You are an expert at restructuring spoken ideas into clean, readable summaries.
Task: Take the sections array in temp_sections.json and add a "clean_summary" field to each section.

Steps to complete task:
1) Read the full raw_transcript of each section.
2) Identify the core idea being communicated.
3) Rewrite it with better sentence structure and flow.
4) Keep the speaker's original words and phrasing wherever possible.
5) Do not add any new ideas, and do not remove any ideas.
6) Write the updated array (containing all original fields plus the new "clean_summary" field for each object) to "temp_sections_final.json".
7) Return ONLY the JSON. Do not write any explanations or Markdown code blocks in the file.`
  fs.writeFileSync(instructionsPath, instructions)

  // 3. Run Claude CLI
  const cmd = `${settings.claudeCommand} -p "Read temp_sections.json. For each section, write a clean summary of its raw_transcript and save the updated array containing 'clean_summary' fields to temp_sections_final.json. Follow the rules in temp_sum_instructions.txt. Do not write any explanations, just write the JSON file." --bare --permission-mode auto`
  console.log(`Executing Claude CLI (Summarize): ${cmd}`)

  await runCommandInShell(cmd, tempDir)

  // 4. Read final sections
  const outputPath = path.join(tempDir, 'temp_sections_final.json')
  if (!fs.existsSync(outputPath)) {
    throw new Error("Claude CLI finished but temp_sections_final.json was not created.")
  }

  const finalContent = fs.readFileSync(outputPath, 'utf8')
  const jsonString = finalContent.replace(/```json|```/g, '').trim()
  return JSON.parse(jsonString)
}

module.exports = {
  runTranscription,
  runSectionSplit,
  runSummarisation,
  getAudioDuration,
  secondsToHHMMSS
}
