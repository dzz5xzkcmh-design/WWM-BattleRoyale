# WWM-BattleRoyale
# 💰 Wer wird Millionär? - Battle Royale Edition

Ein Multiplayer-Quiz-Spiel im "Battle Royale" Stil, bei dem 10 Spieler gegeneinander antreten und der langsamste Spieler jede Runde eliminiert wird.

## 📁 Projektstruktur

```
wwm-battle-royale/
├── index.html              # Lobby & Spieler-Beitritt
├── game.html               # Hauptspiel
├── js/
│   ├── game.js            # Spiellogik
│   └── questions.js       # Fragendatenbank
└── README.md              # Diese Datei
```

## 🚀 Setup in VS Code

### 1. **Projekt erstellen**

```bash
# Ordner erstellen
mkdir wwm-battle-royale
cd wwm-battle-royale

# Git initialisieren (optional)
git init
```

### 2. **Dateien anlegen**

Erstelle die folgenden Dateien in VS Code:

#### **📄 index.html**
- Kopiere den Code aus dem Artifact "index.html - Lobby Seite"
- Speichere als `index.html` im Hauptordner

#### **📄 game.html**
- Kopiere den Code aus dem Artifact "game.html - Hauptspiel"
- Speichere als `game.html` im Hauptordner

#### **📂 js/ Ordner erstellen**

```bash
mkdir js
```

#### **📄 js/questions.js**
- Kopiere den Code aus dem Artifact "questions.js - Fragendatenbank"
- Speichere als `js/questions.js`

#### **📄 js/game.js**
- Kopiere den Code aus dem Artifact "game.js - Hauptspiellogik"
- Speichere als `js/game.js`

### 3. **Live Server installieren (empfohlen)**

```bash
# VS Code Extension installieren:
# 1. Drücke Ctrl+Shift+X (oder Cmd+Shift+X auf Mac)
# 2. Suche nach "Live Server"
# 3. Installiere "Live Server" von Ritwick Dey
```

### 4. **Spiel starten**

1. Öffne `index.html` in VS Code
2. Rechtsklick → "Open with Live Server"
3. Browser öffnet sich automatisch

**ODER** manuell:
```bash
# Einfach index.html im Browser öffnen
# z.B. durch Doppelklick oder:
open index.html  # Mac
start index.html # Windows
```

## 🎮 Spielablauf

### **Phase 1: Lobby**
1. Spieler gibt seinen Namen ein
2. Lobby zeigt Raum-Code
3. Bis zu 10 Spieler können beitreten
4. Host startet das Spiel (min. 2 Spieler)

### **Phase 2: Warteraum**
- 3D-Szene mit allen Spielernamen (A-Frame)
- Nach jeder Frage: Countdown zur nächsten Runde
- Eliminierte Spieler verschwinden aus der Szene

### **Phase 3: Frage**
- **Multiple Choice**: 4 Antwortmöglichkeiten
- **Sortierung**: Drag & Drop zum Sortieren
- **Zeitlimit**: 45 Sekunden pro Frage
- **Fehler**: Bei falscher Antwort kann man es erneut versuchen (Zeit läuft weiter!)

### **Phase 4: Eliminierung**
- Der **langsamste** Spieler wird eliminiert
- Timeout = automatische Eliminierung
- Spiel geht weiter bis nur noch 1 Spieler übrig ist

### **Phase 5: Gewinner**
- Letzter überlebender Spieler gewinnt!

## 🔧 Technische Details

### **WebSocket Integration**

Das Spiel nutzt den WebSocket-Server deines Professors:

```javascript
const webRoomsWebSocketServerAddr = 'https://nosch.uber.space/web-rooms/';
```

#### **Wichtige Message-Types:**

```javascript
// Client → Server
['*enter-room*', roomName]           // Raum beitreten
['*broadcast-message*', type, data]  // Nachricht an alle senden
['player-ready', playerData]         // Spieler bereit
['player-answered', answerData]      // Antwort abgegeben

// Server → Client
['*client-id*', id]                  // Client-ID vom Server
['*client-count*', count]            // Anzahl Clients
['player-joined', playerData]        // Neuer Spieler
['start-game']                       // Spiel starten
['eliminate-player', playerId]       // Spieler eliminiert
```

### **A-Frame 3D-Szene**

Die 3D-Szene zeigt Spielernamen im Kreis an:

```html
<a-scene embedded>
  <a-entity id="player-names" position="0 1.6 -5">
    <!-- Dynamisch generierte Spielernamen -->
  </a-entity>
  <a-sky color="#0a1128"></a-sky>
</a-scene>
```

## 📝 Fragen hinzufügen/bearbeiten

Öffne `js/questions.js`:

```javascript
const QUESTIONS = [
    {
        type: 'multiple-choice',
        question: 'Deine Frage hier?',
        answers: ['Antwort A', 'Antwort B', 'Antwort C', 'Antwort D'],
        correct: 1  // Index der richtigen Antwort (0-3)
    },
    {
        type: 'sorting',
        question: 'Ordne folgende Items:',
        items: ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
        correct: [2, 0, 3, 1]  // Richtige Reihenfolge (Indizes)
    }
];
```

## 🎨 Design anpassen

### **Farben ändern**

In `index.html` und `game.html` im `<style>` Block:

```css
/* Hintergrund */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Goldene Akzente (Buttons, Timer) */
color: #ffd700;

/* Fehler-Farbe */
border-color: #ff4444;
```

### **Timer-Limit anpassen**

In `js/game.js`:

```javascript
gameState.timeLeft = 45;  // Sekunden pro Frage
```

## 🐛 Debugging

### **Browser Console öffnen:**
- Chrome/Edge: `F12` oder `Ctrl+Shift+I`
- Firefox: `F12`
- Safari: `Cmd+Option+I`

### **Häufige Probleme:**

1. **WebSocket verbindet nicht:**
   ```javascript
   // Prüfe in der Console:
   console.log(socket.readyState);
   // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
   ```

2. **A-Frame lädt nicht:**
   - Überprüfe Internet-Verbindung (CDN-Zugriff)
   - Öffne Browser-Console für Fehler

3. **Spieler werden nicht angezeigt:**
   - Prüfe `gameState.players` in der Console
   - Überprüfe WebSocket-Nachrichten

## 📤 GitHub Upload

```bash
# Git initialisieren
git init

# .gitignore erstellen
echo "node_modules/
.DS_Store
*.log" > .gitignore

# Dateien hinzufügen
git add .
git commit -m "Initial commit: WWM Battle Royale"

# GitHub Repository erstellen (auf github.com)
# Dann:
git remote add origin https://github.com/DEIN-USERNAME/wwm-battle-royale.git
git branch -M main
git push -u origin main
```

## 🎯 Nächste Schritte

### **Must-Have Features:**
- [ ] Echter Multiplayer mit Server-Synchronisation
- [ ] Bessere Eliminierungs-Logik (Server-seitig)
- [ ] QR-Code Generator für Lobby
- [ ] Persistente Highscores

### **Nice-to-Have:**
- [ ] Sound-Effekte
- [ ] Animationen bei Eliminierung
- [ ] Chat-Funktion
- [ ] Admin-Panel
- [ ] Mobile-optimierte UI
- [ ] Verschiedene Schwierigkeitsstufen

## 📚 Ressourcen

- **WebSocket Dokumentation:** [MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- **A-Frame Docs:** [aframe.io](https://aframe.io/docs/)
- **Prof-Code Referenz:** Siehe mitgelieferte Datei

## 🤝 Zusammenarbeit

Für Gruppenarbeit:

1. **Aufgaben verteilen:**
   - Person A: Frontend (HTML/CSS)
   - Person B: Spiellogik (game.js)
   - Person C: WebSocket Integration
   - Person D: 3D-Szene & Animationen

2. **Git Branches nutzen:**
   ```bash
   git checkout -b feature/player-ui
   # Änderungen machen
   git commit -m "Add player UI"
   git push origin feature/player-ui
   # Pull Request auf GitHub erstellen
   ```

## 📞 Support

Bei Problemen:
1. Browser Console checken (`F12`)
2. Network Tab für WebSocket-Probleme
3. GitHub Issues erstellen
4. Prof/Kommilitonen fragen

## ✅ Checkliste vor Abgabe

- [ ] Alle Dateien vorhanden
- [ ] Code kommentiert
- [ ] README.md ausgefüllt
- [ ] Spiel getestet (min. 2 Browser-Tabs)
- [ ] Git Repository erstellt
- [ ] Dokumentation vollständig
- [ ] Screenshots/Video für Präsentation

---

**Viel Erfolg mit deinem Semesterprojekt! 🚀**

