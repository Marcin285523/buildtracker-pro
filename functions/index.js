const functions = require('firebase-functions');
const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient();

exports.transcribeAudio = functions.https.onCall(async (data, context) => {
  // Zabezpieczenie: tylko zalogowani użytkownicy mogą używać tej funkcji
  //if (!context.auth) {
    //throw new functions.https.HttpsError('unauthenticated', 'Musisz być zalogowany, aby dyktować.');
  //}
  // 1. KULOODPORNE SZUKANIE AUDIO
  // Niezależnie od tego, jak Firebase spakuje paczkę, nasz kod to znajdzie
  let audioBytes = null;
  if (data && data.audio) {
      audioBytes = data.audio;
  } else if (data && data.data && data.data.audio) {
      audioBytes = data.data.audio;
  } else if (typeof data === 'string') {
      audioBytes = data;
  }

  // Jeśli z jakiegoś powodu paczka jest całkowicie pusta, rzucamy jasny błąd
  if (!audioBytes) {
      console.error("Nie znaleziono audio! Otrzymano:", JSON.stringify(data));
      throw new functions.https.HttpsError('invalid-argument', 'Paczka z audio jest pusta.');
  }

  // 2. PRZYGOTOWANIE ZAPYTANIA DLA GOOGLE
  const request = {
    audio: {
      content: audioBytes,
    },
    config: {
      encoding: 'WEBM_OPUS',
      languageCode: 'pl-PL',
      sampleRateHertz: 48000, // <--- WYMUSZENIE CZĘSTOTLIWOŚCI
    },
  };

  // 3. WYSŁANIE DO TŁUMACZENIA
  try {
    const [response] = await client.recognize(request);
    
    // Jeśli na nagraniu była tylko cisza
    if (!response.results || response.results.length === 0) {
        console.log("Google nie usłyszało żadnych słów.");
        return { text: "" };
    }

    // Wyciągamy poszczególne zdania z odpowiedzi Google
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
      
    return { text: transcription };
  } catch (error) {
    console.error('Błąd transkrypcji:', error);
    throw new functions.https.HttpsError('internal', 'Błąd podczas tłumaczenia przez Google.', error);
  }
});
// --- NOWA SEKCJA: CLOUD VISION ---
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp();
}

const vision = require('@google-cloud/vision');
const visionClient = new vision.ImageAnnotatorClient();

exports.analyzeImage = functions.https.onCall(async (request, context) => {
    // ROZWIĄZANIE ZAGADKI:
    // Wyciągamy dane z "koperty" (request.data) w Firebase v2.
    // (Zostawiamy fallback "|| request", gdyby serwer działał na v1).
    const payload = request.data || request; 
    
    const filePath = payload.filePath;

    if (!filePath) {
        return { tag: 'Błąd: Pusta koperta' };
    }

    try {
        const bucket = admin.storage().bucket('btpro-6fb00.firebasestorage.app');
        const file = bucket.file(filePath);
        
        // Pobieramy surowe dane i wysyłamy prosto do mózgu Google
        const [buffer] = await file.download();
        const [result] = await visionClient.labelDetection(buffer);
        
        const labels = result.labelAnnotations;
        if (!labels || labels.length === 0) {
            return { tag: 'Błąd: AI nic nie widzi' };
        }

        const detectedWords = labels.map(l => l.description.toLowerCase());

        const documentKeywords = [
            'document', 'paper', 'text', 'handwriting', 'font', 'blueprint', 'page', 'diagram'
        ];
        
        let isDocument = detectedWords.some(detectedWord => 
            documentKeywords.some(keyword => detectedWord.includes(keyword))
        );

        if (isDocument) {
            return { tag: 'Dokument' };
        } else {
            return { tag: 'Zdjęcie' };
        }
    } catch (error) {
        console.error(error);
        return { tag: 'Błąd API: ' + error.message.substring(0, 20) };
    }
});
