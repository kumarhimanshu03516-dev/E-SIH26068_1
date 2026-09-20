import * as SQLite from 'expo-sqlite';
import { CurrentWeather, ForecastResponse, AlertsResponse, AdvisoryResponse, Location } from '../types';

const DB_NAME = 'weathergpt.db';

export class StorageService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    if (this.db) return;
    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    await this.runMigrations();
  }

  private async runMigrations() {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS weather_cache (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        fetched_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS alerts_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        severity TEXT NOT NULL,
        area TEXT NOT NULL,
        fetched_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS advisory_cache (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        fetched_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_prefs (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        grounding TEXT,
        cached INTEGER DEFAULT 0
      );
    `);
  }

  // Weather cache
  async getWeatherCache(key: string): Promise<CurrentWeather | ForecastResponse | null> {
    if (!this.db) await this.init();
    const row = await this.db!.getFirstAsync<{ data: string; expires_at: number }>(
      'SELECT data, expires_at FROM weather_cache WHERE key = ? AND expires_at > ?',
      [key, Date.now()]
    );
    if (row) {
      return JSON.parse(row.data);
    }
    return null;
  }

  async setWeatherCache(key: string, data: CurrentWeather | ForecastResponse, ttlMs: number) {
    if (!this.db) await this.init();
    const now = Date.now();
    await this.db!.runAsync(
      'INSERT OR REPLACE INTO weather_cache (key, data, fetched_at, expires_at) VALUES (?, ?, ?, ?)',
      [key, JSON.stringify(data), now, now + ttlMs]
    );
  }

  // Alerts cache
  async getAlertsCache(): Promise<AlertsResponse | null> {
    if (!this.db) await this.init();
    const rows = await this.db!.getAllAsync<{ data: string }>(
      'SELECT data FROM alerts_cache WHERE expires_at > ?',
      [Date.now()]
    );
    if (rows.length > 0) {
      const alerts = rows.map(r => JSON.parse(r.data));
      return { alerts, fetched_at: new Date().toISOString(), cached: true };
    }
    return null;
  }

  async setAlertsCache(alerts: AlertsResponse, ttlMs: number) {
    if (!this.db) await this.init();
    const now = Date.now();
    for (const alert of alerts.alerts) {
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO alerts_cache (id, data, severity, area, fetched_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [alert.id, JSON.stringify(alert), alert.severity, alert.areas.join(','), now, now + ttlMs]
      );
    }
  }

  // Advisory cache
  async getAdvisoryCache(key: string): Promise<AdvisoryResponse | null> {
    if (!this.db) await this.init();
    const row = await this.db!.getFirstAsync<{ data: string; expires_at: number }>(
      'SELECT data, expires_at FROM advisory_cache WHERE key = ? AND expires_at > ?',
      [key, Date.now()]
    );
    if (row) {
      return JSON.parse(row.data);
    }
    return null;
  }

  async setAdvisoryCache(key: string, data: AdvisoryResponse, ttlMs: number) {
    if (!this.db) await this.init();
    const now = Date.now();
    await this.db!.runAsync(
      'INSERT OR REPLACE INTO advisory_cache (key, data, fetched_at, expires_at) VALUES (?, ?, ?, ?)',
      [key, JSON.stringify(data), now, now + ttlMs]
    );
  }

  // User preferences
  async getPref(key: string): Promise<string | null> {
    if (!this.db) await this.init();
    const row = await this.db!.getFirstAsync<{ value: string }>(
      'SELECT value FROM user_prefs WHERE key = ?',
      [key]
    );
    return row?.value || null;
  }

  async setPref(key: string, value: string) {
    if (!this.db) await this.init();
    await this.db!.runAsync(
      'INSERT OR REPLACE INTO user_prefs (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  // Chat history
  async saveMessage(message: { id: string; role: 'user' | 'assistant'; content: string; language: string; timestamp: number; grounding?: any; cached?: boolean }) {
    if (!this.db) await this.init();
    await this.db!.runAsync(
      'INSERT INTO chat_history (id, role, content, language, timestamp, grounding, cached) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [message.id, message.role, message.content, message.language, message.timestamp, JSON.stringify(message.grounding || {}), message.cached ? 1 : 0]
    );
  }

  async getChatHistory(limit: number = 50) {
    if (!this.db) await this.init();
    return this.db!.getAllAsync(
      'SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  }

  async clearChatHistory() {
    if (!this.db) await this.init();
    await this.db!.runAsync('DELETE FROM chat_history');
  }

  // Location
  async saveLocation(location: Location) {
    await this.setPref('location', JSON.stringify(location));
  }

  async getLocation(): Promise<Location | null> {
    const val = await this.getPref('location');
    return val ? JSON.parse(val) : null;
  }
}

export const storage = new StorageService();