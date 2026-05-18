# BuildTracker Pro

BuildTracker Pro to nowoczesna, oparta na chmurze platforma do zarządzania projektami budowlanymi. Jej głównym celem jest płynne łączenie Inwestorów z Wykonawcami na placu budowy. Aplikacja ułatwia komunikację, zarządzanie dokumentacją, tworzenie list materiałowych oraz codzienne raportowanie postępów prac przy użyciu najnowszych technologii (w tym AI).

---

## Główne Funkcjonalności

* **Dedykowane panele (Role-based access):** Osobne interfejsy i uprawnienia dla Inwestora (zarządzanie, monitoring) oraz Wykonawcy (raportowanie z placu budowy).
* **Raportowanie na żywo (Real-time Timeline):** Oś czasu synchronizująca się w czasie rzeczywistym dzięki Firebase Firestore. Każdy nowy raport dodany przez wykonawcę jest natychmiast widoczny dla inwestora.
* **Wsparcie AI – Dyktowanie (Speech-to-Text):** Możliwość dyktowania raportów na placu budowy z wykorzystaniem wbudowanego interfejsu przeglądarki (MediaRecorder) oraz modeli Google Cloud Speech.
* **Wsparcie AI – Analiza Obrazu (Cloud Vision):** Automatyczne kategoryzowanie wgrywanych załączników. System za pomocą sztucznej inteligencji rozpoznaje, czy wgrany plik to np. skan faktury/planu budowy (tag "Dokument"), czy fotografia postępów prac (tag "Zdjęcie").
* **Eksport Offline (Archiwum ZIP):** Moduł Inwestora posiada wbudowany generator paczek `.zip` (biblioteka JSZip), który pobiera i formatuje całą historię budowy do fizycznego archiwum (tekst + zdjęcia).

---

## Stos Technologiczny

* **Frontend:** HTML5, CSS3 (Custom Properties, Flexbox, CSS Grid), JavaScript (ES6+, Modules).
* **Backend (BaaS):** Firebase (Auth, Firestore, Storage).
* **Serverless / API:** Firebase Cloud Functions (Node.js).
* **Integracje Cloud:** Google Cloud Vision API, Google Cloud Speech-to-Text.
* **Zewnętrzne biblioteki JS:** JSZip, FileSaver.js.

---

## Architektura Projektu (Przegląd Plików)

### 1. Mikro-backend (`index.js`)
Plik wdrażany jako usługa **Firebase Cloud Functions**. Pełni rolę bezpiecznego środowiska dla operacji wymagających ukrycia kluczy API.
* Udostępnia funkcję `transcribeAudio`, która parsuje dane audio wysłane z frontendu i odpytuje Google Cloud Speech API w celu zwrócenia transkrypcji (w języku polskim).
* Udostępnia funkcję `analyzeImage`, która z wykorzystaniem Firebase Admin SDK pobiera wgrane obrazy ze Storage'u i weryfikuje ich zawartość używając Google Cloud Vision. 

### 2. Autoryzacja i Routing (`index.html`)
Klasyczna bramka dostępowa (Single Page Application dla widoku logowania i rejestracji).
* Posiada doskonałe wsparcie dla dostępności (A11y), w tym role ARIA i `skip-link`.
* Integruje `Firebase Auth`. Rozpoznaje rolę użytkownika na podstawie danych wpisanych do Firestore i odpowiednio przekierowuje do panelu Inwestora lub Wykonawcy. Obsługuje inteligentne linkowanie z parametrami URL.

### 3. Panel Inwestora (`investor.html`)
Pulpit sterujący (Dashboard) dla właściciela inwestycji lub kierownika.
* Pozwala na pełne operacje CRUD (tworzenie, odczyt, edycja, usuwanie) na projekcie, w tym zarządzanie listą materiałów i dokumentacją (`updateDoc`, `deleteDoc`).
* Generuje dedykowane linki dostępowe dla Wykonawców.
* Nasłuchuje strumienia logów (Snapshots) z placu budowy.
* Pozwala spakować postępy projektu bez obciążania serwera dzięki client-side renderingowi paczki ZIP.

### 4. Panel Wykonawcy (`contractor.html`)
Interfejs stworzony z myślą o urządzeniach mobilnych używanych bezpośrednio na budowie.
* Przed wyrenderowaniem zawartości weryfikuje w bazie Firestore, czy dany użytkownik na pewno ma uprawnienia roli `contractor`.
* Renderuje w trybie "Tylko do odczytu" wymagania Inwestora (materiały, dokumenty).
* Pozwala wgrywać zdjęcia i dyktować notatki, wysyłając złożone zapytania do chmury (zdjęcie trafia do Storage, następnie jest analizowane przez AI, a cały raport wędruje do Firestore).

### 5. Design System (`styles.css`)
Globalny arkusz stylów zbudowany w architekturze "Utility-first" (zbliżonej koncepcyjnie do Tailwind CSS).
* Całość kolorystyki, promieni zaokrągleń oraz cieni bazuje na zmiennych CSS (`:root`), co zapewnia nieskazitelną spójność (Design System).
* Interfejs jest w 100% responsywny (RWD), adaptując układ Grid na urządzeniach mobilnych do formy smukłej listy jedno-kolumnowej.
---

## Struktura Projektu

```text
buildtracker-pro/
│
├── functions/                  # Główny katalog backendu
│   ├── index.js                # Logika serwera (AI Vision API)
│   ├── package.json            # Zależności Node.js dla serwera
│   └── package-lock.json       
│
├── public/                     # Główny katalog frontendu (Hosting)
│   ├── index.html              # Widok logowania / autoryzacji
│   ├── investor.html           # Aplikacja Inwestora
│   ├── contractor.html         # Aplikacja Wykonawcy
│   └── styles.css              # Globalne style CSS
│
├── cors.json                   # Konfiguracja uprawnień pobierania z chmury
├── firebase.json               # Konfiguracja środowiska Firebase
├── .firebaserc                 # Powiązanie z projektem Google Cloud
├── .gitignore                  # Wykluczenia dla systemu Git
└── README.md                   # Główna dokumentacja projektu (ten plik)
