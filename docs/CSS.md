# CSS.md — System projektowania i stylów · BuildTracker Pro

> Dokumentacja opisuje architekturę CSS, design system oraz konwencje stylowania aplikacji BuildTracker Pro.  
> Stack: czysty CSS3 (bez preprocesora), zmienne CSS, Grid, Flexbox — zero zewnętrznych frameworków UI.

---

## 1. Filozofia stylowania

BuildTracker Pro stosuje podejście **"CSS bez zależności"** — cały system wizualny zawarty jest w jednym pliku `public/styles.css`. Oznacza to:

- brak Bootstrap, Tailwind ani żadnego CSS frameworka,
- pełna kontrola nad każdym szczegółem wizualnym,
- zero konfliktów ze stylami zewnętrznych bibliotek,
- mały rozmiar pliku CSS (szybkie ładowanie na słabych łączach mobilnych).

---

## 2. Zmienne CSS (Custom Properties)

Cały design system opiera się na zmiennych zdefiniowanych w `:root`. Zmiana jednej wartości propaguje się przez całą aplikację.

```css
:root {
  /* === PALETA KOLORÓW === */
  --color-primary:       #2563eb;   /* akcent główny — niebieski */
  --color-primary-dark:  #1d4ed8;   /* hover / active primary */
  --color-secondary:     #0f172a;   /* tło ciemne, nagłówki */
  --color-surface:       #ffffff;   /* powierzchnia kart i modali */
  --color-surface-alt:   #f8fafc;   /* tło alternacyjne (panel, sidebar) */
  --color-border:        #e2e8f0;   /* obramowania, separatory */
  --color-text-primary:  #0f172a;   /* tekst główny */
  --color-text-secondary:#64748b;   /* tekst pomocniczy, metadane */
  --color-text-inverse:  #ffffff;   /* tekst na ciemnym tle */

  /* === TAGI AI === */
  --tag-photo-bg:        #dcfce7;   /* zielony — "Zdjęcie z budowy" */
  --tag-photo-text:      #166534;
  --tag-doc-bg:          #dbeafe;   /* niebieski — "Dokument techniczny" */
  --tag-doc-text:        #1e40af;

  /* === STATUSY MATERIAŁÓW === */
  --status-delivered:    #22c55e;   /* dostarczone */
  --status-ordered:      #f59e0b;   /* zamówione */
  --status-missing:      #ef4444;   /* brakuje */

  /* === TYPOGRAFIA === */
  --font-sans:     'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:     'JetBrains Mono', 'Fira Code', monospace;
  --text-xs:       0.75rem;    /* 12px */
  --text-sm:       0.875rem;   /* 14px */
  --text-base:     1rem;       /* 16px */
  --text-lg:       1.125rem;   /* 18px */
  --text-xl:       1.25rem;    /* 20px */
  --text-2xl:      1.5rem;     /* 24px */
  --text-3xl:      1.875rem;   /* 30px */

  /* === PRZESTRZEŃ (spacing scale) === */
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */

  /* === ZAOKRĄGLENIA === */
  --radius-sm:   0.25rem;
  --radius-md:   0.5rem;
  --radius-lg:   0.75rem;
  --radius-xl:   1rem;
  --radius-full: 9999px;

  /* === CIENIE === */
  --shadow-sm:  0 1px 2px 0 rgba(0,0,0,.05);
  --shadow-md:  0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06);
  --shadow-lg:  0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05);
  --shadow-xl:  0 20px 25px -5px rgba(0,0,0,.1), 0 10px 10px -5px rgba(0,0,0,.04);

  /* === ANIMACJE === */
  --transition-fast:   150ms ease;
  --transition-base:   250ms ease;
  --transition-slow:   400ms ease;
}
```

---

## 3. Reset i style bazowe

Plik `styles.css` otwiera się zunifikowanym resetem:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  background-color: var(--color-surface-alt);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

img {
  display: block;
  max-width: 100%;
}

button {
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
}
```

---

## 4. Układ strony (Layout)

### 4.1 Widok autoryzacji (`index.html`)

Wyśrodkowanie pionowe i poziome przez Flexbox:

```css
body.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-secondary) 0%, #1e3a5f 100%);
}

.auth-container {
  width: 100%;
  max-width: 420px;
  padding: var(--space-8);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}
```

### 4.2 Panel Inwestora — układ Dashboard

CSS Grid z fixed sidebar i elastycznym obszarem treści:

```css
.dashboard {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 1fr;
  min-height: calc(100vh - 60px); /* minus wysokość headera */
  gap: 0;
}

.sidebar {
  background: var(--color-secondary);
  color: var(--color-text-inverse);
  padding: var(--space-6) var(--space-4);
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.content-area {
  padding: var(--space-8);
  overflow-y: auto;
}
```

### 4.3 Panel Wykonawcy — Mobile First

Układ blokowy, jedna kolumna:

```css
.contractor-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  padding: var(--space-4);
}
```

---

## 5. Komponenty

### 5.1 Przyciski

Hierarchia wizualna trzech poziomów:

```css
/* Primary — akcje główne */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: background var(--transition-fast);
}
.btn-primary:hover { background: var(--color-primary-dark); }

/* Secondary — akcje drugorzędne */
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 600;
}

/* Ghost — akcje trzeciorzędne / niszczące */
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  padding: var(--space-2) var(--space-4);
}

/* Duży przycisk mobilny (Wykonawca) */
.btn-primary-large {
  width: 100%;
  padding: var(--space-4) var(--space-6);
  font-size: var(--text-lg);
  min-height: 56px;
  border-radius: var(--radius-lg);
}
```

### 5.2 Karty (Cards)

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base);
}
.card:hover { box-shadow: var(--shadow-md); }

.report-card {
  border-left: 4px solid var(--color-primary);
  margin-bottom: var(--space-6);
}
```

### 5.3 Tagi AI

Dwa warianty — zielony (zdjęcie) i niebieski (dokument):

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

.tag--photo {
  background: var(--tag-photo-bg);
  color: var(--tag-photo-text);
}

.tag--document {
  background: var(--tag-doc-bg);
  color: var(--tag-doc-text);
}
```

### 5.4 Statusy materiałów

```css
.status-badge {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.status-badge--delivered { background: var(--status-delivered); }
.status-badge--ordered   { background: var(--status-ordered); }
.status-badge--missing   { background: var(--status-missing); }
```

### 5.5 Formularze

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

input[type="text"],
input[type="email"],
input[type="password"],
textarea {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base); /* 16px — zapobiega zoom na iOS */
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  background: var(--color-surface);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
```

### 5.6 Modale

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-base);
}
.modal-overlay.active {
  opacity: 1;
  pointer-events: all;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  max-width: 540px;
  width: calc(100% - var(--space-8));
  box-shadow: var(--shadow-xl);
  transform: translateY(16px);
  transition: transform var(--transition-base);
}
.modal-overlay.active .modal { transform: translateY(0); }
```

---

## 6. Galeria dokumentów

```css
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-4);
}

.doc-card {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
}

.doc-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}
.doc-card:hover img { transform: scale(1.05); }

.doc-card .tag {
  position: absolute;
  bottom: var(--space-2);
  left: var(--space-2);
}
```

---

## 7. Responsywność

Punkty przełamania (breakpoints):

| Nazwa | Szerokość | Zmiana układu |
|---|---|---|
| Mobile | < 640px | Sidebar zwinięty / ukryty; treść full-width |
| Tablet | 640px – 1024px | Sidebar narrower (200px); mniej kolumn w grid |
| Desktop | > 1024px | Układ pełny: sidebar 260px + content |

```css
/* Tablet */
@media (max-width: 1024px) {
  .dashboard { grid-template-columns: 200px 1fr; }
  .docs-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
}

/* Mobile */
@media (max-width: 640px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .sidebar {
    position: static;
    height: auto;
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    padding: var(--space-3) var(--space-4);
  }
  .content-area { padding: var(--space-4); }
}
```

---

## 8. Animacje i przejścia

### 8.1 Pojawianie się kart raportów

```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.report-card {
  animation: slideInUp var(--transition-base) both;
}

/* Stagger dla wielu kart */
.report-card:nth-child(1) { animation-delay: 0ms; }
.report-card:nth-child(2) { animation-delay: 50ms; }
.report-card:nth-child(3) { animation-delay: 100ms; }
```

### 8.2 Wskaźnik dyktowania (Wykonawca)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(1.2); }
}

#dictation-status.listening::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--status-missing); /* czerwony */
  animation: pulse 1s ease infinite;
  margin-right: var(--space-2);
}
```

### 8.3 Progress bar uploadu

```css
.upload-progress {
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.upload-progress-bar {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
  width: 0%;
}
```

---

## 9. Konwencje nazewnictwa klas

Projekt stosuje uproszczone podejście **BEM-like** bez ścisłego trzymania się notacji `__element--modifier`:

| Typ | Przykład |
|---|---|
| Blok / komponent | `.report-card`, `.auth-container`, `.docs-grid` |
| Wariant / modyfikator | `.tag--photo`, `.btn-primary`, `.status-badge--missing` |
| Stan | `.active`, `.hidden`, `.loading`, `.listening` |
| Układ | `.dashboard`, `.sidebar`, `.content-area` |
| Narzędziowe | `.text-sm`, `.mt-4` (sporadycznie, dla drobnych korekt) |

---

## 10. Dostępność wizualna

- **Focus styles:** wszystkie elementy interaktywne mają wyraźny `outline` przy focus (nie `outline: none` bez zastępstwa).
- **Kontrast:** teksty pomocnicze (`--color-text-secondary` na białym tle) spełniają WCAG AA (4.65:1).
- **Tagi AI:** kolory tagów dobrane pod kontrast WCAG AA względem ich tła.
- **Rozmiar dotyku:** minimalny `min-height: 44px` dla wszystkich przycisków i elementów klikalnych.

---

*Ostatnia aktualizacja dokumentacji: maj 2026*
