import { useRef } from 'react';
import { WavStreamPlayer, WavRecorder } from 'wavtools';

/**
 * Hook to manage OpenAI Realtime voice streaming via WebSockets with PCM16.
 */
export function useVoiceWebSockets(
  onUser: (text: string) => void,
  onAssistant: (text: string) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const wavPlayerRef = useRef<WavStreamPlayer | null>(null);
  const wavRecorderRef = useRef<WavRecorder | null>(null);
  // current track ID for audio playback; bump after interrupt to allow restart
  const trackIdRef = useRef<string>(crypto.randomUUID());

  const isActiveRef = useRef(false);

  const start = async () => {
    const realtimeModel = "gpt-4o-realtime-preview";
    const transcribeModel = "gpt-4o-transcribe";

    if (isActiveRef.current) return;
    isActiveRef.current = true;

    try {
      // Initialize WavStreamPlayer for audio playback
      const player = new WavStreamPlayer({ sampleRate: 24000 });
      await player.connect();
      wavPlayerRef.current = player;

      // Initialize WavRecorder for audio input
      const recorder = new WavRecorder({ sampleRate: 24000 });
      await recorder.begin();
      wavRecorderRef.current = recorder;

      // Use relative path for WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const baseUrl = `${protocol}//${window.location.host}/api/v1/realtime?model=${realtimeModel}`;

      const ws = new WebSocket(baseUrl);

      wsRef.current = ws;

      ws.addEventListener('open', () => {
        console.log('WebSocket connected');

        // Send session configuration
        const sessionUpdate = {
          type: 'session.update',
          session: {
            voice: 'alloy',
            
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',

            input_audio_transcription: {
              model: transcribeModel,
            },
            
            turn_detection: {
              type: 'semantic_vad',
              create_response: true,
              interrupt_response: true,
            }
          }
        };

        ws.send(JSON.stringify(sessionUpdate));

        // Start recording immediately after WebSocket connects
        console.log('Starting audio recording after WebSocket connection...');
        recorder.record((data) => {
          // Check if session is still active first
          if (!isActiveRef.current) {
            return;
          }

          const { mono } = data;

          // Handle ArrayBuffer data properly
          const monoArray = mono ? new Int16Array(mono) : null;

          // Use wsRef.current to get the current WebSocket state
          const currentWs = wsRef.current;
          if (currentWs && currentWs.readyState === WebSocket.OPEN && monoArray && isActiveRef.current) {
            try {
              // Convert Int16Array audio data to base64 PCM16
              const float32Array = new Float32Array(monoArray.length);

              for (let i = 0; i < monoArray.length; i++) {
                float32Array[i] = monoArray[i] / (monoArray[i] < 0 ? 0x8000 : 0x7fff);
              }
              const audio = base64EncodeAudio(float32Array);

              if (audio && isActiveRef.current) {
                currentWs.send(JSON.stringify({
                  type: 'input_audio_buffer.append',
                  audio: audio
                }));
              }
            } catch (error) {
              console.error('Error processing audio data:', error);
            }
          }
          // Remove the warning log to reduce noise when session is properly stopped
        }).catch(error => {
          console.error('Failed to start recording:', error);
        });
      });

      ws.addEventListener('message', (e) => {
        const msg = JSON.parse(e.data);
        console.log('Received message:', msg.type);

        switch (msg.type) {
          case 'input_audio_buffer.speech_started':
            console.log('User started speaking, audio playback will be interrupted');
            wavPlayerRef.current?.interrupt();
            break;
          
          case 'input_audio_buffer.speech_stopped':
            console.log('User stopped speaking, audio playback can resume');
            // reset track ID so that subsequent add16BitPCM restarts playback
            trackIdRef.current = crypto.randomUUID();
            break;

          case 'conversation.item.input_audio_transcription.delta':
            break;

          case 'conversation.item.input_audio_transcription.completed':
            console.log('Transcription completed:', msg.transcript);

            if (msg.transcript?.trim()) {
              onUser(msg.transcript);
            }
            break;
          
          case 'response.audio.delta':
            if (msg.delta) {
              playAudioChunk(msg.delta);
            }
            
            break;

          case 'response.done':
            console.log('Response complete:', msg.response);

            if (msg.response?.output?.[0]?.content?.[0]?.transcript) {
              onAssistant(msg.response.output[0].content[0].transcript);
            }
            break;

          case 'error':
            console.error('OpenAI Error:', msg.error);
            break;
        }
      });

      ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
      });

      ws.addEventListener('close', (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
      });

      console.log('Voice session initialized, waiting for session ready...');
    } catch (error) {
      console.error('Failed to start voice session:', error);
      // Clean up on error
      await stop();
      throw error;
    }
  };

  const stop = async () => {
    console.log('Stopping voice session...');

    // First, set the active flag to false to prevent any new audio processing
    isActiveRef.current = false;

    // Stop recorder
    if (wavRecorderRef.current) {
      try {
        console.log('Stopping audio recorder...');
        
        // End the recording session
        await wavRecorderRef.current.end();
        wavRecorderRef.current = null;
      } catch (error) {
        console.error('Error stopping recorder:', error);
        // Force cleanup even if end() fails
        try {
          if (wavRecorderRef.current) {
            await wavRecorderRef.current.pause();
          }
        } catch (pauseError) {
          console.error('Error pausing recorder during cleanup:', pauseError);
        }
        wavRecorderRef.current = null;
      }
    }

    // Close WebSocket
    const ws = wsRef.current;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          console.log('Closing WebSocket connection...');
          ws.close(1000, 'User stopped session');
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      wsRef.current = null;
    }

    // Stop audio player
    if (wavPlayerRef.current) {
      try {
        console.log('Stopping audio player...');
        wavPlayerRef.current.interrupt();
      } catch (error) {
        console.error('Error interrupting player:', error);
      }
      wavPlayerRef.current = null;
    }

    console.log('Voice session stopped');
  };

  const setInstructions = (instructions: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: { instructions }
      }));
      console.log('Instructions updated:', instructions);
    } else {
      console.warn('Cannot set instructions: WebSocket not connected');
    }
  };

  const setVoice = (voice: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: { voice }
      }));
      console.log('Voice updated:', voice);
    } else {
      console.warn('Cannot set voice: WebSocket not connected');
    }
  };

  // Convert Float32Array of audio data to base64-encoded PCM16
  const floatTo16BitPCM = (float32Array: Float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const base64EncodeAudio = (float32Array: Float32Array) => {
    const arrayBuffer = floatTo16BitPCM(float32Array);
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32KB chunk size
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string) => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  };

  const playAudioChunk = (base64: string) => {
    const player = wavPlayerRef.current;
    if (!player) {
      console.warn('No audio player available');
      return;
    }

    if (!base64) {
      console.warn('Empty audio data received');
      return;
    }

    try {
      const buf = base64ToArrayBuffer(base64);
      const samples = new Int16Array(buf);
      // use a fresh trackId after interrupts to allow restarting playback
      player.add16BitPCM(samples, trackIdRef.current);
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  return { start, stop, setInstructions, setVoice };
}