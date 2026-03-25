# TempMon

TempMon ist eine Full-Stack-Anwendung zur nachhaltigen Temperaturüberwachung, entwickelt im Rahmen eines Projekts der **Bugenhagenschule Alsterdorf** unter der Leitung von **Miguel Lopez**. Ziel ist es, Heizenergie zu sparen, indem unnötiges Beheizen von Räumen transparent gemacht wird.

## Übersicht

- Automatische Erkennung von Temperatursensoren im lokalen Netzwerk via mDNS (jmdns).
- Speicherung aller Messdaten in einer PostgreSQL-Datenbank.
- Bereitstellung einer **RESTful API** mit OpenAPI-Spezifikation unter `/appApi.json`.
- Automatisch generierter TypeScript-Fetch-Client für das Frontend.
- OTA-Firmware-Updates für ESP32-Geräte über WLAN (via `espota.py`).
- mDNS-basierte Geräte-Discovery für automatisches Auffinden neuer Sensoren.
- Mehrsprachige Benutzeroberfläche (i18next).

## Projektkontext

In diesem Projekt ging es darum, die Temperaturentwicklung in den Räumen der Schule zu überwachen, um gerade in der Winterzeit den größten Energieverbrauch durch Heizung zu identifizieren und unnötiges Heizen zu reduzieren.

---

## Systemarchitektur

![Systemarchitektur](./images/application.svg)

### Tech-Stack

| Schicht      | Technologien                                                        |
| ------------ | ------------------------------------------------------------------- |
| **Backend**  | Kotlin, http4k, jOOQ, Jetty, ShadowJar, OpenAPI-Generation         |
| **Datenbank**| PostgreSQL                                                          |
| **Frontend** | React 18, TypeScript, MUI, Ant Design, Recharts, react-router-dom  |
| **Build**    | Gradle (Kotlin JVM, Node-Gradle-Plugin), Yarn                      |
| **Geräte**   | ESP32 Sensoren, OTA-Updates via espota.py, mDNS-Discovery (jmdns)  |

---

## Voraussetzungen

- **JDK 21**
- **Node.js 20** und **Yarn** (werden automatisch via Gradle heruntergeladen)
- **PostgreSQL** Datenbank

---

## Installation & Start

1. Repository klonen:
   ```bash
   git clone https://github.com/benlukka/tempmon.git
   cd tempmon
   ```

2. PostgreSQL-Datenbank einrichten (Standard: `TempMon`, User/Passwort: `postgres`/`postgres`).

3. Backend und Frontend bauen und starten:
   ```bash
   ./gradlew run
   ```
   Das Frontend wird automatisch mit gebaut und als statische Ressource in das Backend eingebettet.

4. Anwendung aufrufen: `http://localhost:9247`

### Umgebungsvariablen

| Variable            | Standardwert | Beschreibung                      |
| ------------------- | ------------ | --------------------------------- |
| `POSTGRES_USER`     | `postgres`   | Datenbank-Benutzer                |
| `POSTGRES_PASSWORD` | `postgres`   | Datenbank-Passwort                |
| `API_PORT`          | `9247`       | Port, auf dem das Backend lauscht |

---

## API-Endpunkte

Die vollständige OpenAPI-Spezifikation ist unter `http://localhost:9247/appApi.json` verfügbar.

| Methode | Pfad                          | Beschreibung                                    |
| ------- | ----------------------------- | ----------------------------------------------- |
| `POST`  | `/request`                    | Messdaten (Temperatur/Luftfeuchtigkeit) senden  |
| `GET`   | `/measurements`               | Alle Messwerte (paginiert)                      |
| `GET`   | `/measurements/device`        | Messwerte eines bestimmten Geräts               |
| `GET`   | `/measurements/timerange`     | Messwerte in einem Zeitraum                     |
| `GET`   | `/measurements/avgTemperature`| Durchschnittstemperatur in einem Zeitraum        |
| `GET`   | `/measurements/avgHumidity`   | Durchschnittliche Luftfeuchtigkeit              |
| `GET`   | `/measurements/latest`        | Letzte Messung pro Gerät                        |
| `GET`   | `/devices`                    | Alle registrierten Geräte                       |
| `GET`   | `/offlineDevices`             | Geräte, die in den letzten 3 Stunden offline waren |
| `GET`   | `/rooms`                      | Alle Räume mit zugeordneten Geräten             |
| `GET`   | `/rooms/measurements`         | Messwerte für einen bestimmten Raum             |

---

## Projektstruktur

```
├── src/main/kotlin/          # Backend-Quellcode (Kotlin)
│   ├── Main.kt               # Einstiegspunkt, startet Server & mDNS
│   ├── Server.kt             # HTTP-Routen & API-Konfiguration
│   ├── JooqProvider.kt       # Datenbankzugriff via jOOQ
│   ├── MdnsAdvertiser.kt     # mDNS-Service-Advertising
│   └── OTAUpdateService.kt   # OTA-Updates & Geräte-Discovery
├── src/main/resources/       # OpenAPI-Spezifikation
├── frontend/                 # React-Frontend
│   ├── src/
│   │   ├── components/       # UI-Komponenten (Dashboard)
│   │   └── generated/        # Auto-generierter TypeScript-API-Client
│   └── package.json
├── build.gradle              # Gradle-Build-Konfiguration
└── espota.py                 # ESP32 OTA-Upload-Skript
```

---

## Mitwirken (Contributing)

1. Forken des Repositories
2. Neuen Feature-Branch erstellen:
   ```bash
   git checkout -b feature/MeinFeature
   ```
3. Änderungen commiten:
   ```bash
   git commit -m "Mein Feature hinzugefügt"
   ```
4. Push und Pull Request eröffnen

---

## Lizenz

Dieses Projekt steht unter der MIT License. Details siehe [LICENSE](./LICENSE).

---

## Kontakt

Projektleitung: Miguel Lopez (Bugenhagenschule Alsterdorf)

Bei Fragen oder Feedback einfach ein Issue eröffnen oder Kontakt über GitHub aufnehmen.
