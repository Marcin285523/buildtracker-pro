# BuildTracker Pro

**BuildTracker Pro** to nowoczesna, w pełni responsywna aplikacja webowa zaprojektowana do zarządzania i monitorowania postępu prac budowlanych w czasie rzeczywistym. System opiera się na architekturze Serverless (Firebase) i wykorzystuje zaawansowane mechanizmy Sztucznej Inteligencji Google Cloud (Vision API oraz Speech-to-Text).

---

## Główne Funkcjonalności

* **Panel Inwestora / Kierownika Budowy:**
  * Tworzenie i zarządzanie profilem inwestycji.
  * Zarządzanie wirtualną listą zapotrzebowania na materiały budowlane.
  * Przechowywanie dokumentacji technicznej i rzutów architektonicznych.
  * Śledzenie raportów Wykonawcy na żywo (Oś Czasu).
  * **Eksport do ZIP:** Asynchroniczne generowanie pełnego archiwum budowy (raporty tekstowe oraz wszystkie załączniki zdjęciowe) bezpośrednio po stronie przeglądarki.
* **Mobilny Panel Wykonawcy:**
  * Minimalistyczny interfejs przystosowany do pracy w trudnych warunkach (Mobile First).
  * Automatyczne przypisywanie raportów do właściwego projektu na podstawie linków z parametrami.
  * **Speech-to-Text:** Wbudowana funkcja dyktowania raportów z wykorzystaniem systemowego rozpoznawania mowy.
* **Rozpoznawanie Obrazu AI (Cloud Vision):**
  * Automatyczna analiza każdego wgrywanego zdjęcia przez serwer.
  * Inteligentne przypisywanie tagów: system odróżnia zwykłe zdjęcia z placu budowy od dokumentów (faktury, schematy, plany) i nadaje im odpowiednie, kolorowe etykiety.

---

## Wykorzystane Technologie

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+).
* **Backend:** Node.js, Firebase Cloud Functions (v2).
* **Baza Danych i Pliki:** Cloud Firestore (Realtime), Firebase Storage.
* **Autoryzacja:** Firebase Authentication.
* **Sztuczna Inteligencja:** Google Cloud Vision API, Google Cloud Speech-To-Text API.
* **Narzędzia zewnętrzne:** JSZip, FileSaver.js (do obsługi archiwów ZIP na kliencie).

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
