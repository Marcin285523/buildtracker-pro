# JAVASCRIPT.md — Architektura JavaScript · BuildTracker Pro

> Dokumentacja opisuje strukturę logiki klienckiej oraz backendowej aplikacji BuildTracker Pro.  
> Stack: Vanilla JS (ES6+) po stronie frontendu, Node.js + Firebase Cloud Functions (v2) po stronie serwera.

---

## 1. Filozofia i podejście

Aplikacja jest napisana w czystym JavaScript (bez frameworków SPA typu React/Vue), co zapewnia:

- minimalne bundle size i błyskawiczny czas pierwszego załadowania,
- pełną kontrolę nad cyklem życia komponentów,
- łatwą integrację z Firebase SDK wstrzykiwanym przez CDN.

Całość opiera się na **architekturze reaktywnej opartej na listenerach Firestore** — interfejs aktualizuje się automatycznie, gdy dane w bazie ulegają zmianie, bez potrzeby ręcznego odpytywania serwera.

---

## 2. Pliki JavaScript frontendu

Logika kliencka jest osadzona bezpośrednio w plikach HTML jako moduły `<script type="module">`.

### 2.1 `public/index.html` — Moduł autoryzacji

**Odpowiedzialność:** obsługa logowania i rejestracji użytkowników.

| Funkcja / blok | Opis |
|---|---|
| `onAuthStateChanged(auth, user => ...)` | Reaguje na zmianę stanu sesji; przekierowuje zalogowanego użytkownika do odpowiedniego panelu. |
| `signInWithEmailAndPassword(...)` | Logowanie za pomocą e-mail + hasło (Firebase Auth). |
| `createUserWithEmailAndPassword(...)` | Rejestracja nowego konta. |
| Obsługa formularzy | Walidacja pól przed wywołaniem metod Firebase; wyświetlanie komunikatów błędów inline. |

**Przepływ autoryzacji:**
```
Wejście na stronę
    └─► onAuthStateChanged
            ├─► brak sesji → wyświetl formularz logowania
            └─► sesja aktywna → przekieruj do investor.html lub contractor.html
```

---

### 2.2 `public/investor.html` — Moduł Inwestora / Kierownika Budowy

**Odpowiedzialność:** zarządzanie projektem, przeglądanie raportów, eksport archiwum.

#### Główne obszary logiczne

**A. Zarządzanie projektem**
- Tworzenie nowej inwestycji — zapis do kolekcji `projects` w Firestore.
- Edycja nazwy, adresu, opisu projektu.
- Generowanie unikalnego linku dla Wykonawcy (URL z parametrem `?pid=<projectId>`).

**B. Lista zapotrzebowania na materiały**
- Struktura: podkolekcja `materials` zagnieżdżona pod dokumentem projektu.
- CRUD: dodawanie pozycji, zmiana statusu (zamówione / dostarczone / brakuje), usuwanie.
- Renderowanie listy napędzane przez `onSnapshot()` — aktualizacje w czasie rzeczywistym.

**C. Dokumentacja techniczna**
- Upload plików (rzuty architektoniczne, dokumenty PDF) do Firebase Storage.
- Po wgraniu pliku: wywołanie Cloud Function `analyzeImage` (patrz sekcja 4) i zapis metadanych + tagów AI do Firestore.
- Galeria dokumentów z kolorowymi etykietami (zdjęcie z budowy / dokument techniczny).

**D. Oś Czasu raportów**
- Listener `onSnapshot` na podkolekcji `reports` posortowanej wg `timestamp DESC`.
- Każdy raport renderowany jako karta zawierająca: datę, treść, zdjęcia, tagi AI, dane autora.

**E. Eksport ZIP**
```
Kliknięcie "Eksportuj archiwum"
    └─► Iteracja po wszystkich raportach projektu (Firestore)
    └─► Pobranie plików binarnych ze Storage (fetch blob)
    └─► Kompresja za pomocą JSZip (po stronie przeglądarki)
    └─► Zapis pliku przez FileSaver.js → <nazwa_projektu>_archiwum.zip
```
Eksport jest w pełni **asynchroniczny i po stronie klienta** — nie angażuje serwera.

---

### 2.3 `public/contractor.html` — Mobilny Panel Wykonawcy

**Odpowiedzialność:** wprowadzanie raportów z placu budowy; zoptymalizowany pod urządzenia mobilne.

#### Główne obszary logiczne

**A. Identyfikacja projektu**
- Odczyt parametru `?pid=` z `window.location.search`.
- Pobranie dokumentu projektu z Firestore i wyświetlenie jego nazwy w nagłówku.
- Brak `pid` → komunikat błędu z prośbą o użycie właściwego linku.

**B. Formularz raportu**
- Pole tekstowe na opis wykonanych prac.
- Możliwość dołączenia zdjęć (`<input type="file" accept="image/*" multiple>`).
- Przycisk wysyłania → upload zdjęć do Storage, zapis raportu do Firestore.

**C. Speech-to-Text**
```javascript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'pl-PL';
recognition.continuous = false;
recognition.interimResults = true;

recognition.onresult = (event) => {
  textarea.value = event.results[0][0].transcript;
};
```
Korzysta z **Web Speech API** (natywne API przeglądarki) — brak dodatkowych wywołań sieciowych po stronie klienta. Dla urządzeń nieobsługujących API przycisk dyktowania jest ukryty.

---

## 3. Zarządzanie stanem

Aplikacja nie używa globalnego store'a (Redux, Zustand itp.). Stan jest zarządzany lokalnie w każdym module:

| Mechanizm | Zastosowanie |
|---|---|
| `onSnapshot()` Firestore | Reaktywny stan danych z bazy — główny "store" aplikacji |
| Zmienne modułu ES6 | Tymczasowy stan UI (aktywna zakładka, aktualny projekt, tryb edycji) |
| `URLSearchParams` | Stan routingu (który projekt jest aktywny w panelu Wykonawcy) |
| Firebase Auth session | Stan sesji użytkownika — persystowany automatycznie przez SDK |

---

## 4. Backend — Firebase Cloud Functions (`functions/index.js`)

**Środowisko:** Node.js, Firebase Functions v2.

### 4.1 Funkcja `analyzeImage`

**Wyzwalacz:** HTTP (callable function) — wywoływana przez klienta po każdym wgraniu zdjęcia.

**Przepływ:**
```
Klient wgrywa plik → wysyła wywołanie analyzeImage({ storagePath })
    └─► Funkcja pobiera plik z Firebase Storage (jako buffer)
    └─► Wysyła buffer do Google Cloud Vision API (feature: LABEL_DETECTION + DOCUMENT_TEXT_DETECTION)
    └─► Analiza odpowiedzi:
            ├─► wykryto tekst / schemat → tag: "Dokument techniczny" (etykieta niebieska)
            └─► brak tekstu → tag: "Zdjęcie z budowy" (etykieta zielona)
    └─► Zwraca { tag, labels } do klienta
    └─► Klient zapisuje metadane do Firestore
```

**Zależności serwera** (`functions/package.json`):
- `@google-cloud/vision` — klient Vision API
- `firebase-admin` — dostęp do Storage i Firestore po stronie serwera
- `firebase-functions` — dekoratory i konfiguracja Cloud Functions v2

---

## 5. Obsługa błędów

| Warstwa | Podejście |
|---|---|
| Firebase Auth | `try/catch` wokół metod auth; kody błędów mapowane na polskie komunikaty inline |
| Firestore / Storage | `catch` na każdej obietnicy; toast/alert w UI informujący użytkownika |
| Cloud Functions | Rzucanie `HttpsError` z kodem i wiadomością; klient obsługuje `.catch()` |
| Speech API | Sprawdzenie dostępności `window.SpeechRecognition` przed inicjalizacją |
| Eksport ZIP | Obsługa błędów podczas pobierania plików ze Storage (pominięcie brakujących plików z ostrzeżeniem) |

---

## 6. Konwencje kodu

- **ES6+ everywhere:** `async/await`, `const/let`, template literals, destructuring, optional chaining (`?.`).
- **Brak transpilera:** kod działa natywnie w nowoczesnych przeglądarkach (Chrome 90+, Safari 15+, Firefox 90+).
- **Firebase SDK v9 (modular):** import tylko potrzebnych funkcji — tree-shaking w CDN bundle.
- **Funkcje anonimowe vs nazwane:** funkcje obsługi zdarzeń jako strzałkowe inline; logika biznesowa wyekstrahowana do nazwanych funkcji asynchronicznych.

---

## 7. Zewnętrzne biblioteki klienckie

| Biblioteka | Wersja | Cel |
|---|---|---|
| Firebase SDK (Auth, Firestore, Storage, Functions) | v9+ | Cały backend-as-a-service |
| JSZip | 3.x | Kompresja plików po stronie przeglądarki |
| FileSaver.js | 2.x | Zapis pliku ZIP na dysk użytkownika |
| Web Speech API | natywne | Dyktowanie raportów (Speech-to-Text bez API key) |

---

*Ostatnia aktualizacja dokumentacji: maj 2026*
