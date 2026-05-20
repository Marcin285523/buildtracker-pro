/**
 * @file index.js
 * @description Firebase Cloud Functions obsługujące dwie usługi Google AI:
 *   1. transcribeAudio – transkrypcja mowy na tekst (Google Cloud Speech-to-Text)
 *   2. analyzeImage    – klasyfikacja obrazu jako dokument lub zdjęcie (Google Cloud Vision)
 */

// ─── Zależności globalne ───────────────────────────────────────────────────────

const functions = require('firebase-functions');
const speech = require('@google-cloud/speech');

/**
 * Klient Google Cloud Speech-to-Text.
 * Inicjalizowany raz na poziomie modułu – dzięki temu Firebase może ponownie
 * używać tego samego procesu między kolejnymi wywołaniami funkcji (tzw. "warm instance"),
 * co skraca czas odpowiedzi.
 */
const client = new speech.SpeechClient();

// ─── Cloud Function: transcribeAudio ──────────────────────────────────────────

/**
 * Callable Cloud Function przyjmująca nagranie audio w formacie base64
 * i zwracająca transkrypcję tekstu w języku polskim.
 *
 * Oczekiwany payload (wysyłany przez klienta):
 *   { audio: "<base64-encoded audio>" }
 *
 * Zwracana wartość:
 *   { text: "<transkrypcja>" }  – lub pusty string, jeśli nic nie zostało nagrane.
 *
 * @param {object} data    – Dane przesłane przez klienta.
 * @param {object} context – Kontekst Firebase (informacje o uwierzytelnieniu itp.).
 */
exports.transcribeAudio = functions.https.onCall(async (data, context) => {

  // UWAGA: Poniższy blok autoryzacji jest tymczasowo wyłączony podczas developmentu.
  // Przed wdrożeniem produkcyjnym należy go odkomentować, aby tylko zalogowani
  // użytkownicy mogli korzystać z kosztownego API Speech-to-Text.
  //
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'Musisz być zalogowany, aby dyktować.');
  // }

  // ── Krok 1: Wyodrębnienie danych audio z ładunku ──────────────────────────
  //
  // Firebase może zapakować dane na kilka różnych sposobów w zależności od wersji SDK
  // i środowiska (Firebase v1 vs v2, emulator vs produkcja). Poniższy kod defensywnie
  // sprawdza trzy możliwe miejsca, gdzie może znajdować się zakodowane audio:
  //   a) bezpośrednio pod data.audio          (standardowy przypadek)
  //   b) zagnieżdżone w data.data.audio       (podwójne opakowanie przez Firebase v2)
  //   c) cały obiekt data jest stringiem      (tryb uproszczony / testowy)

  let audioBytes = null;

  if (data && data.audio) {
    audioBytes = data.audio;
  } else if (data && data.data && data.data.audio) {
    audioBytes = data.data.audio;
  } else if (typeof data === 'string') {
    audioBytes = data;
  }

  // Jeśli audio nie zostało znalezione w żadnym ze znanych miejsc, przerywamy
  // wykonanie i zwracamy czytelny błąd zamiast pozwolić na niejasną awarię dalej.
  if (!audioBytes) {
    console.error("Nie znaleziono audio! Otrzymano:", JSON.stringify(data));
    throw new functions.https.HttpsError('invalid-argument', 'Paczka z audio jest pusta.');
  }

  // ── Krok 2: Budowanie zapytania do Google Speech-to-Text ──────────────────
  //
  // Parametry konfiguracyjne dopasowane do formatu nagrań z przeglądarki:
  //   - encoding: WEBM_OPUS  → format produkowany przez MediaRecorder API w Chrome/Firefox
  //   - languageCode: pl-PL  → transkrypcja w języku polskim
  //   - sampleRateHertz: 48000 → jawne wymuszenie częstotliwości próbkowania, bo Google
  //                              czasem błędnie ją wykrywa z nagłówka WEBM, co powoduje
  //                              zniekształcenia lub błędy transkrypcji

  const request = {
    audio: {
      content: audioBytes, // Zakodowany base64 plik audio
    },
    config: {
      encoding: 'WEBM_OPUS',
      languageCode: 'pl-PL',
      sampleRateHertz: 48000,
    },
  };

  // ── Krok 3: Wywołanie API i przetworzenie odpowiedzi ──────────────────────

  try {
    const [response] = await client.recognize(request);

    // Google może zwrócić pustą tablicę wyników, gdy:
    //   - nagranie zawierało tylko ciszę lub szum tła
    //   - mowa była zbyt cicha lub niewyraźna
    // W takim przypadku zwracamy pusty tekst zamiast rzucać wyjątek.
    if (!response.results || response.results.length === 0) {
      console.log("Google nie usłyszało żadnych słów.");
      return { text: "" };
    }

    // Google dzieli transkrypcję na segmenty (np. zdania lub fragmenty mowy).
    // Dla każdego segmentu wybieramy wariant z najwyższą pewnością (alternatives[0])
    // i łączymy wszystkie segmenty w jeden tekst, rozdzielając je znakiem nowej linii.
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    return { text: transcription };

  } catch (error) {
    // Każdy błąd sieciowy lub błąd API jest logowany po stronie serwera
    // i przekazywany klientowi jako ustandaryzowany błąd Firebase.
    console.error('Błąd transkrypcji:', error);
    throw new functions.https.HttpsError('internal', 'Błąd podczas tłumaczenia przez Google.', error);
  }
});

// ─── Inicjalizacja Firebase Admin SDK ─────────────────────────────────────────

/**
 * Firebase Admin SDK jest wymagane do dostępu do Firebase Storage (pobieranie plików).
 * Guard `!admin.apps.length` zapobiega błędowi podwójnej inicjalizacji, który
 * może wystąpić gdy Firebase ponownie używa tego samego środowiska uruchomieniowego
 * dla wielu funkcji (warm instance).
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}

// ─── Zależności Cloud Vision ───────────────────────────────────────────────────

const vision = require('@google-cloud/vision');

/**
 * Klient Google Cloud Vision – odpowiada za analizę zawartości obrazów.
 * Podobnie jak klient Speech, inicjalizowany raz na poziomie modułu.
 */
const visionClient = new vision.ImageAnnotatorClient();

// ─── Cloud Function: analyzeImage ─────────────────────────────────────────────

/**
 * Callable Cloud Function przyjmująca ścieżkę do pliku w Firebase Storage
 * i klasyfikująca obraz jako "Dokument" lub "Zdjęcie".
 *
 * Oczekiwany payload (wysyłany przez klienta):
 *   { filePath: "uploads/user123/photo.jpg" }
 *
 * Zwracana wartość:
 *   { tag: "Dokument" | "Zdjęcie" | "Błąd: ..." }
 *
 * @param {object} request – Dane przesłane przez klienta (w Firebase v2 owinięte w obiekt).
 * @param {object} context – Kontekst Firebase.
 */
exports.analyzeImage = functions.https.onCall(async (request, context) => {

  // ── Wyodrębnienie właściwego ładunku ──────────────────────────────────────
  //
  // Firebase v2 opakowuje dane klienta w obiekt z kluczem `data`,
  // podczas gdy Firebase v1 przekazuje je bezpośrednio jako pierwszy argument.
  // Operator `||` zapewnia kompatybilność wsteczną z obydwoma wersjami.

  const payload = request.data || request;
  const filePath = payload.filePath;

  // Jeśli ścieżka do pliku nie została przekazana, zwracamy błąd bez wywoływania API.
  if (!filePath) {
    return { tag: 'Błąd: Pusta koperta' };
  }

  try {
    // ── Pobranie pliku z Firebase Storage ──────────────────────────────────
    //
    // Łączymy się z konkretnym bucketem projektu Firebase i pobieramy plik
    // do pamięci jako bufor binarny (Buffer). Nie zapisujemy pliku lokalnie –
    // środowisko Cloud Functions ma ograniczony i ulotny filesystem.

    const bucket = admin.storage().bucket('btpro-6fb00.firebasestorage.app');
    const file = bucket.file(filePath);
    const [buffer] = await file.download();

    // ── Analiza zawartości obrazu przez Google Cloud Vision ────────────────
    //
    // `labelDetection` zwraca listę etykiet opisujących zawartość obrazu,
    // np. ["document", "paper", "text", "sky", "person"] wraz z wartością
    // pewności (score) dla każdej z nich.

    const [result] = await visionClient.labelDetection(buffer);
    const labels = result.labelAnnotations;

    // Jeśli Vision API nie wykryło żadnych obiektów (np. pusty lub uszkodzony plik),
    // zwracamy odpowiedni komunikat.
    if (!labels || labels.length === 0) {
      return { tag: 'Błąd: AI nic nie widzi' };
    }

    // ── Klasyfikacja na podstawie wykrytych etykiet ─────────────────────────
    //
    // Normalizujemy wszystkie etykiety do małych liter, aby porównanie było
    // odporne na różnice w wielkości znaków zwracanych przez API.

    const detectedWords = labels.map(l => l.description.toLowerCase());

    // Słowa kluczowe charakterystyczne dla dokumentów, skanów i pism.
    // Jeśli którakolwiek etykieta z obrazu zawiera którekolwiek z tych słów,
    // obraz klasyfikujemy jako dokument (a nie zdjęcie).
    const documentKeywords = [
      'document', 'paper', 'text', 'handwriting', 'font', 'blueprint', 'page', 'diagram'
    ];

    const isDocument = detectedWords.some(detectedWord =>
      documentKeywords.some(keyword => detectedWord.includes(keyword))
    );

    // Zwracamy prostą etykietę – klient może jej używać np. do wybrania
    // odpowiedniego sposobu dalszego przetwarzania pliku.
    return { tag: isDocument ? 'Dokument' : 'Zdjęcie' };

  } catch (error) {
    // Logujemy pełny błąd po stronie serwera, ale klientowi zwracamy tylko
    // skrócony komunikat (pierwsze 20 znaków), aby nie ujawniać szczegółów
    // infrastruktury w odpowiedzi API.
    console.error(error);
    return { tag: 'Błąd API: ' + error.message.substring(0, 20) };
  }
});
