const express = require('express')
const axios = require('axios')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'your-voice-id'

app.post('/tts', async (req, res) => {
  const text = req.body.text
  if (!text) return res.status(400).json({ error: 'Missing text' })

  try {
    const audioResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      { text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        responseType: 'arraybuffer'
      }
    )

    const base64Audio = Buffer.from(audioResponse.data, 'binary').toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`

    return res.json({ audioUrl })
  } catch (err) {
    console.error(err.response?.data || err.message)
    res.status(500).json({ error: 'TTS failed' })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Katrina voice server running on port ${port}`))