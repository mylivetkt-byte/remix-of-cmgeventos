import { useState, useRef, useCallback } from "react";

interface VoiceRecorderState {
  isRecording: boolean;
  recordingTime: number;
  transcript: string;
  audioBlob: Blob | null;
  audioUrl: string | null;
  isSupported: boolean;
  error: string | null;
}

export const useVoiceRecorder = () => {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    recordingTime: 0,
    transcript: "",
    audioBlob: null,
    audioUrl: null,
    isSupported: typeof window !== "undefined" && ("MediaRecorder" in window || "webkitSpeechRecognition" in window || "SpeechRecognition" in window),
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null, transcript: "", audioBlob: null, audioUrl: null, recordingTime: 0 }));

      // 1. Iniciar SpeechRecognition si está disponible
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = "es-ES";
          recognition.continuous = true;
          recognition.interimResults = true;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            let currentTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }
            setState((prev) => ({ ...prev, transcript: currentTranscript }));
          };

          recognition.onerror = () => {
            // Error silencioso en reconocimiento para no frenar la grabación
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn("SpeechRecognition no pudo iniciarse:", e);
        }
      }

      // 2. Iniciar MediaRecorder para capturar el audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setState((prev) => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
        }));
        // Apagar tracks de audio
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);

      // Cronómetro
      timerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
      }, 1000);

      setState((prev) => ({ ...prev, isRecording: true }));
    } catch (err: unknown) {
      console.error("Error al iniciar grabación:", err);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: "No se pudo acceder al micrófono. Por favor verifica los permisos.",
      }));
    }
  }, []);

  const stopRecording = useCallback((): Promise<{ transcript: string; audioBlob: Blob | null }> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignorar error de stop
        }
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.addEventListener(
          "stop",
          () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            resolve({
              transcript: state.transcript,
              audioBlob,
            });
          },
          { once: true }
        );
        mediaRecorderRef.current.stop();
      } else {
        resolve({
          transcript: state.transcript,
          audioBlob: null,
        });
      }
    });
  }, [state.transcript]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorar
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setState((prev) => ({
      ...prev,
      isRecording: false,
      recordingTime: 0,
      transcript: "",
      audioBlob: null,
      audioUrl: null,
    }));
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime,
  };
};
