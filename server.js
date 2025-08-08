const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { ElevenLabsClient } = require('elevenlabs')

const app = express()
const port = process.env.PORT || 10000

app.use(cors())
app.use(bodyParser.json())

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
})

app.post('/', async (req, res) => {
  const { text, voice } = req.body

  if (!text) {
    return res.status(400).json({ error: 'No text provided' })
  }

  try {
    const audio = await elevenlabs.generate({
      voice: voice || 'BZgkqPqms7Kj9ulSkVzn', // Default to Eve
      model_id: 'eleven_monolingual_v1',
      text,
      output_format: 'mp3_44100_128'
    })

    const base64 = Buffer.from(audio).toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${base64}`
    const audioTag = `<audio src="${audioUrl}" autoplay="true"></audio>`

    res.json({ audioUrl, audioTag })
  } catch (err) {
    console.error('❌ TTS Error:', err)
    res.status(500).json({ error: 'TTS generation failed' })
  }
})

app.listen(port, () => {
  console.log(`Katrina voice server running on port ${port}`)
})
