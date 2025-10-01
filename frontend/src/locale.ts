import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n
    .use(initReactI18next)
    .init({
        lng: "en",

        fallbackLng: "en",

        debug: true,

        interpolation: {
            escapeValue: false,
        },

        resources: {
            en: {
                translation: {
                    loading_measurements: "Loading measurements...",
                    no_measurements_last_week: "No measurements found for the last week.",
                    weekly_downloads: "Weekly Downloads",
                    aria_showing_weekly_downloads: "Showing weekly downloads",
                    downloads_title: "Downloads",
                    downloads_icon_aria: "Downloads icon",
                    error_prefix: "Error: ",
                    failed_to_load_environmental_data: "Failed to load environmental data.",
                    temperature_overview_title: "Temperature Overview",
                    avg_temperature_this_week: "Average Temperature This Week",
                    change_vs_last_week: "Change vs. Last Week: ",
                    not_available_short: "N/A",
                    humidity_overview_title: "Humidity Overview",
                    avg_humidity_this_week: "Average Humidity This Week",
                    devices_heading: "Devices",
                    version_label: "Version",
                    board_label: "Board",
                    chip_label: "Chip",
                    last_seen_label: "Last Seen",
                    // MeasurementTable
                    table_room: "Room",
                    table_timestamp: "Timestamp",
                    table_temperature: "Temperature",
                    table_humidity: "Humidity",
                    // RoomCompare general
                    room_compare_title: "Room Comparison",
                    select_room_a_placeholder: "Select Room A",
                    select_room_b_placeholder: "Select Room B",
                    compare_latest_button: "Compare Latest",
                    loading_latest_data: "Loading latest data...",
                    // Labels
                    temperature_label: "Temperature",
                    humidity_label: "Humidity",
                    // Differences and descriptions
                    temperature_difference_title: "Temperature Difference",
                    room_is_warmer_or_equal: "{{room}} is warmer or equal.",
                    room_is_warmer: "{{room}} is warmer.",
                    humidity_difference_title: "Humidity Difference",
                    room_is_more_humid_or_equal: "{{room}} is more humid or equal.",
                    room_is_more_humid: "{{room}} is more humid.",
                    // Historic comparison
                    historic_compare_title: "Historic Comparison",
                    load_historic_data_button: "Load Historic Data",
                    show_temperature_label: "Show Temperature",
                    show_humidity_label: "Show Humidity",
                    loading_historic_data: "Loading historic data...",
                    historic_measurements_title: "Historic Measurements",
                    no_historic_data_for_period: "No historic data available for this period. Try a different range.",
                    // Notifications / errors
                    error_loading_rooms: "Failed to load rooms",
                    warning_select_two_rooms_to_compare: "Please select two rooms to compare.",
                    warning_no_latest_measurements: "No latest measurements found for one or both rooms.",
                    error_loading_latest_measurements: "Failed to load latest measurements.",
                    warning_select_two_rooms_and_timerange: "Please select two rooms and a time range.",
                    warning_no_historic_data_both: "No historic data found for either room.",
                    error_loading_historic_data: "Failed to load historic measurements.",
                },
            },
            de: {
                translation: {
                    loading_measurements: "Messungen werden geladen...",
                    no_measurements_last_week: "Keine Messungen für die letzte Woche gefunden.",
                    weekly_downloads: "Wöchentliche Downloads",
                    aria_showing_weekly_downloads: "Wöchentliche Downloads anzeigen",
                    downloads_title: "Downloads",
                    downloads_icon_aria: "Downloads-Symbol",
                    error_prefix: "Fehler: ",
                    failed_to_load_environmental_data: "Umweltdaten konnten nicht geladen werden.",
                    temperature_overview_title: "Temperatur Übersicht",
                    avg_temperature_this_week: "Durchschnittliche Temperatur Diese Woche",
                    change_vs_last_week: "Veränderung vs. Letzte Woche: ",
                    not_available_short: "k. A.",
                    humidity_overview_title: "Luftfeuchtigkeit Übersicht",
                    avg_humidity_this_week: "Durchschnittliche Luftfeuchtigkeit Diese Woche",
                    devices_heading: "Geräte",
                    version_label: "Version",
                    board_label: "Board",
                    chip_label: "Chip",
                    last_seen_label: "Zuletzt gesehen",

                    // MeasurementTable
                    table_room: "Raum",
                    table_timestamp: "Zeitstempel",
                    table_temperature: "Temperatur",
                    table_humidity: "Luftfeuchtigkeit",

                    // RoomCompare overall
                    room_compare_title: "Raumvergleich",
                    select_room_a_placeholder: "Raum A auswählen",
                    select_room_b_placeholder: "Raum B auswählen",
                    compare_latest_button: "Aktuelle vergleichen",
                    loading_latest_data: "Lade aktuelle Daten...",

                    // Labels
                    temperature_label: "Temperatur",
                    humidity_label: "Luftfeuchtigkeit",

                    // Differenzen und Beschreibungen
                    temperature_difference_title: "Temperaturdifferenz",
                    room_is_warmer_or_equal: "{{room}} ist wärmer oder gleich.",
                    room_is_warmer: "{{room}} ist wärmer.",
                    humidity_difference_title: "Luftfeuchtigkeitsdifferenz",
                    room_is_more_humid_or_equal: "{{room}} ist feuchter oder gleich.",
                    room_is_more_humid: "{{room}} ist feuchter.",

                    // Historic Comparison
                    historic_compare_title: "Historischer Vergleich",
                    load_historic_data_button: "Historische Daten laden",
                    show_temperature_label: "Temperatur anzeigen",
                    show_humidity_label: "Luftfeuchtigkeit anzeigen",
                    loading_historic_data: "Lade historische Daten...",
                    historic_measurements_title: "Historische Messdaten",
                    no_historic_data_for_period: "Keine historischen Daten für diesen Zeitraum verfügbar. Versuche einen anderen Zeitraum.",

                    // Messages / Errors
                    error_loading_rooms: "Räume konnten nicht geladen werden",
                    warning_select_two_rooms_to_compare: "Bitte zwei Räume zum Vergleichen auswählen.",
                    warning_no_latest_measurements: "Keine aktuellen Messwerte für einen oder beide Räume gefunden.",
                    error_loading_latest_measurements: "Aktuelle Messwerte konnten nicht geladen werden.",
                    warning_select_two_rooms_and_timerange: "Bitte zwei Räume und einen Zeitraum auswählen.",
                    warning_no_historic_data_both: "Keine historischen Daten für beide Räume gefunden.",
                    error_loading_historic_data: "Historische Messwerte konnten nicht geladen werden.",
                }
            }
        },
    });

export default i18n;