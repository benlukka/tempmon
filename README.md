# TempMon

TempMon ist eine Full-Stack-Anwendung zur nachhaltigen Temperaturüberwachung, entwickelt im Rahmen eines Projekts der **Bugenhagenschule Alsterdorf** unter der Leitung von **Miguel Lopez**. Ziel ist es, Heizenergie zu sparen, indem unnötiges Beheizen von Räumen transparent gemacht wird.

## Übersicht

- Automatische Erkennung von Temperatursensoren im lokalen Netzwerk via mDNS (jmdns).
- Speicherung aller Messdaten in einer PostgreSQL-Datenbank.
- Bereitstellung einer **RESTful API** mit OpenAPI-Spezifikation (Swagger) unter `openapi.json`.
- Möglichkeit zur einfachen Integration eines eigenen Frontends oder Clients durch automatische Generierung eines TypeScript-Fetch-Clients.
- Docker-Compose-basiertes Setup für schnelle Installation und Start.

## Projektkontext

In diesem Projekt ging es darum, die Temperaturentwicklung in den Räumen der Schule zu überwachen, um gerade in der Winterzeit den größten Energieverbrauch durch Heizung zu identifizieren und unnötiges Heizen zu reduzieren.

---

## Systemarchitektur

![Systemarchitektur](./images/application.svg)
   
- **Backend**: Kotlin, http4k, jOOQ, PostgreSQL, ShadowJar, OpenAPI-Generation
- **Datenbank**: PostgreSQL
- **Frontend**: React, OpenAPI-Client (TypeScript)

---

## Voraussetzungen

- Docker
- Docker Compose

---

## Installation & Start (Docker Compose)

1. Repository klonen:
   ```bash
   git clone https://github.com/benlukka/tempmon.git
   cd tempmon
   ```
2. Mit Docker Compose bauen und starten:
   ```bash
   docker-compose up --build -d
   ```
3. Dienste:
   - **Backend/API**: `http://localhost:9247`
   - **Datenbank**: PostgreSQL auf Port `5432` (User/Passwort: `postgres`/`postgres`, DB: `TempMon`)

---

## OpenAPI-Spezifikation & API-Integration

Die API-Routen und ihre Funktionalität sind in der Datei `openapi.json` dokumentiert:

- **Einsehen**: `http://localhost:9247/openapi.json`
- **Typisierte Clients**: Ein TypeScript-Fetch-Client wird automatisch basierend auf dieser Spezifikation erstellt.

Beispiele für Endpunkte:

- `GET /sensors` – Liste aller erkannten Sensoren
- `GET /readings?sensorId={id}` – Messwerte eines Sensors abfragen
- `POST /readings` – Neue Messung hinzufügen (intern)

Für ein eigenes Frontend binden Sie den TypeScript-Client ein oder rufen die Endpunkte direkt über Ihre bevorzugte HTTP-Bibliothek auf.

---

## Konfiguration

Per Umgebungsvariablen in der `docker-compose.yml` anpassbar:

| Variable            | Standardwert | Beschreibung                      |
| ------------------- |--------------| --------------------------------- |
| `POSTGRES_USER`     | `postgres`   | Datenbank-Benutzer                |
| `POSTGRES_PASSWORD` | `postgres`   | Datenbank-Passwort                |
| `POSTGRES_DB`       | `TempMon`    | Name der Datenbank                |
| `API_PORT`          | `9247`       | Port, auf dem das Backend lauscht |

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

Bitte achtet auf Code-Stil und ergänzt bei neuen Features am besten auch noch entsprechende Tests.

---

## Lizenz

Dieses Projekt steht unter der MIT License. Details siehe [LICENSE](./LICENSE).

---

## Kontakt

Projektleitung: Miguel Lopez (Bugenhagenschule Alsterdorf)

Bei Fragen oder Feedback einfach ein Issue eröffnen oder Kontakt über GitHub aufnehmen.

