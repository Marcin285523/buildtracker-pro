# HTML.md — Struktura widoków · BuildTracker Pro

> Dokumentacja opisuje strukturę i architekturę plików HTML aplikacji BuildTracker Pro.  
> Wszystkie widoki to samodzielne strony SPA oparte na HTML5 + Firebase SDK ładowanym przez CDN.

---

## 1. Architektura widoków

Aplikacja składa się z **trzech niezależnych stron HTML**, z których każda pełni odrębną rolę:

```
public/
├── index.html        ← Brama wejściowa (autoryzacja)
├── investor.html     ← Panel Inwestora / Kierownika Budowy
└── contractor.html   ← Mobilny Panel Wykonawcy
```

Podział na osobne pliki HTML (zamiast jednej strony z routerem JS) zapewnia:
- izolację kodu i uprawnień per widok,
- pełny reload kontekstu Firebase przy zmianie roli użytkownika,
- prostszą logikę routingu — przekierowania przez `window.location.href`.

---

## 2. `index.html` — Widok autoryzacji

### 2.1 Cel

Punkt wejścia do aplikacji. Obsługuje **logowanie** istniejących użytkowników oraz **rejestrację** nowych kont. Po pomyślnej autoryzacji następuje przekierowanie do właściwego panelu.

### 2.2 Struktura dokumentu

```
<html>
└── <head>
│     ├── charset, viewport, title
│     ├── <link rel="stylesheet" href="styles.css">
│     └── Firebase SDK (compat CDN) — auth
│
└── <body>
      └── .auth-container
            ├── .logo-section
            │     ├── <h1>BuildTracker Pro</h1>
            │     └── tagline / ikona
            │
            ├── #login-form (domyślnie widoczny)
            │     ├── <input type="email">
            │     ├── <input type="password">
            │     ├── <button> Zaloguj się
            │     └── <a> → przełącz na rejestrację
            │
            ├── #register-form (domyślnie ukryty)
            │     ├── <input type="email">
            │     ├── <input type="password">
            │     ├── <input type="password"> (powtórz)
            │     ├── <button> Zarejestruj się
            │     └── <a> → przełącz na logowanie
            │
            └── #error-message (inline, ukryty domyślnie)
```

### 2.3 Semantyka i dostępność

- Pola formularzy powiązane z `<label>` przez atrybut `for` / `id`.
- Przyciski akcji jako `<button type="button">` (nie `type="submit"`) — obsługa przez JS.
- Komunikaty błędów w `role="alert"` dla czytników ekranu.

---

## 3. `investor.html` — Panel Inwestora

### 3.1 Cel

Rozbudowany dashboard dla roli Inwestora / Kierownika Budowy. Umożliwia tworzenie projektów, zarządzanie dokumentacją, przeglądanie raportów Wykonawcy na żywo i eksport archiwum.

### 3.2 Struktura dokumentu

```
<html>
└── <head>
│     ├── viewport (desktop + tablet), title dynamiczny
│     ├── <link rel="stylesheet" href="styles.css">
│     └── Firebase SDK — auth, firestore, storage, functions
│
└── <body>
      ├── <header class="app-header">
      │     ├── logo + nazwa projektu (dynamiczna)
      │     └── <nav> + przycisk wylogowania
      │
      ├── <main class="dashboard">
      │     │
      │     ├── .sidebar (nawigacja panelami)
      │     │     ├── btn: "Moje projekty"
      │     │     ├── btn: "Materiały"
      │     │     ├── btn: "Dokumentacja"
      │     │     └── btn: "Raporty"
      │     │
      │     └── .content-area
      │           │
      │           ├── #panel-projects (widok: lista projektów)
      │           │     ├── .project-cards (generowane dynamicznie z Firestore)
      │           │     └── <button> Nowy projekt → modal
      │           │
      │           ├── #panel-materials (widok: lista materiałów)
      │           │     ├── .materials-list (onSnapshot)
      │           │     └── form dodawania pozycji
      │           │
      │           ├── #panel-docs (widok: galeria dokumentów)
      │           │     ├── .docs-grid (karty z tagami AI)
      │           │     └── <input type="file"> upload + progress bar
      │           │
      │           └── #panel-reports (widok: oś czasu raportów)
      │                 ├── .timeline (onSnapshot, sorted DESC)
      │                 └── <button> Eksportuj ZIP
      │
      └── <!-- Modals -->
            ├── #modal-new-project
            │     ├── input: nazwa, adres, opis
            │     └── btn: Zapisz / Anuluj
            │
            └── #modal-share-link
                  ├── <input readonly> URL dla Wykonawcy
                  └── btn: Kopiuj do schowka
```

### 3.3 Panele i ich przełączanie

Wszystkie panele (`#panel-*`) istnieją jednocześnie w DOM, ale tylko jeden jest widoczny w danej chwili (klasa CSS `active` / `hidden`). Przełączanie odbywa się przez JS bez przeładowania strony.

### 3.4 Karty raportów (Oś Czasu)

Każda karta raportu generowana dynamicznie zawiera:

```html
<article class="report-card">
  <header>
    <span class="report-date">...</span>
    <span class="report-author">...</span>
  </header>
  <p class="report-content">...</p>
  <div class="report-gallery">
    <!-- miniatury zdjęć z tagami AI -->
    <figure>
      <img src="..." alt="...">
      <figcaption class="tag tag--photo">Zdjęcie z budowy</figcaption>
      <!-- lub -->
      <figcaption class="tag tag--document">Dokument techniczny</figcaption>
    </figure>
  </div>
</article>
```

---

## 4. `contractor.html` — Mobilny Panel Wykonawcy

### 4.1 Cel

Minimalistyczny interfejs **Mobile First** przeznaczony do pracy w trudnych warunkach — rękawicach, słabym oświetleniu, na rusztowaniu. Priorytet: duże elementy dotykowe, mało kroków do wysłania raportu.

### 4.2 Struktura dokumentu

```
<html>
└── <head>
│     ├── viewport: width=device-width, initial-scale=1 (brak zoom lock)
│     ├── theme-color (kolor paska przeglądarki na Android)
│     ├── <link rel="stylesheet" href="styles.css">
│     └── Firebase SDK — auth, firestore, storage, functions
│
└── <body class="contractor-view">
      │
      ├── <header class="contractor-header">
      │     ├── logo (uproszczone)
      │     └── #project-name-display (dynamicznie z Firestore)
      │
      ├── <main class="contractor-main">
      │     │
      │     ├── #project-info-bar
      │     │     └── adres / data
      │     │
      │     ├── .report-form
      │     │     ├── <label> Opis prac
      │     │     ├── <textarea id="report-text" rows="6">
      │     │     │
      │     │     ├── .speech-controls
      │     │     │     ├── <button id="btn-start-dictation"> 🎤 Dyktuj
      │     │     │     └── #dictation-status (wskaźnik nasłuchiwania)
      │     │     │
      │     │     ├── <label class="file-upload-label"> 📷 Dodaj zdjęcia
      │     │     │     └── <input type="file" accept="image/*" multiple hidden>
      │     │     │
      │     │     ├── #photo-preview-grid (miniatury przed wysłaniem)
      │     │     │
      │     │     └── <button id="btn-submit" class="btn-primary-large">
      │     │               Wyślij raport
      │     │           </button>
      │     │
      │     └── #submission-feedback (sukces / błąd po wysłaniu)
      │
      └── #error-no-project (widoczny gdy brak ?pid= w URL)
```

### 4.3 Responsywność i Mobile First

- Układ w jednej kolumnie (`display: block` / `flex-direction: column`).
- Minimalna wysokość dotykowego elementu: **48px** (zgodnie z wytycznymi Material Design / WCAG).
- `<textarea>` z `font-size: 16px` — zapobiega automatycznemu zoom na iOS Safari.
- Upload zdjęć przez `<input type="file">` ukryty pod stylowanym `<label>` — natywne okno wyboru pliku / aparatu na mobile.

---

## 5. Wspólne elementy HTML

### 5.1 Firebase SDK

Każda strona ładuje Firebase przez CDN (moduł ES):
```html
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js';
  // ...
</script>
```

Konfiguracja `firebaseConfig` jest wbudowana inline w każdym pliku (klucze publiczne — bezpieczne po stronie klienta, chronione regułami Firestore).

### 5.2 Metadane SEO / PWA

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#1a1a2e">
<meta name="description" content="BuildTracker Pro — zarządzanie budową">
<link rel="icon" type="image/png" href="/favicon.png">
```

### 5.3 Dostępność (a11y)

- `aria-label` na ikonowych przyciskach (bez tekstu widocznego).
- `role="status"` na elementach pokazujących postęp (upload, dyktowanie).
- Kolory tagów AI spełniają kontrast WCAG AA (minimum 4.5:1).

---

## 6. Bezpieczeństwo po stronie HTML

- Brak wrażliwych danych w atrybutach HTML (klucze API Firebase są publiczne per design).
- Reguły Firestore Security Rules chronią dane — sama strona HTML nie wymaga autoryzacji serwera.
- Treść generowana dynamicznie z Firestore jest wstawiana przez `textContent` (nie `innerHTML`) tam, gdzie to możliwe, by unikać XSS.

---

*Ostatnia aktualizacja dokumentacji: maj 2026*
