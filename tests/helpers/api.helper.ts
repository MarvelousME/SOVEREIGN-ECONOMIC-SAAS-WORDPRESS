import request from 'supertest';
import { Express } from 'express';

export class ApiHelper {
  private app: Express;
  private token?: string;

  constructor(app: Express) {
    this.app = app;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = undefined;
  }

  get(url: string, headers: Record<string, string> = {}) {
    const req = request(this.app).get(url);
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    Object.entries(headers).forEach(([key, value]) => {
      req.set(key, value);
    });
    return req;
  }

  post(url: string, body?: any, headers: Record<string, string> = {}) {
    const req = request(this.app).post(url);
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    Object.entries(headers).forEach(([key, value]) => {
      req.set(key, value);
    });
    if (body) {
      req.send(body);
    }
    return req;
  }

  put(url: string, body?: any, headers: Record<string, string> = {}) {
    const req = request(this.app).put(url);
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    Object.entries(headers).forEach(([key, value]) => {
      req.set(key, value);
    });
    if (body) {
      req.send(body);
    }
    return req;
  }

  patch(url: string, body?: any, headers: Record<string, string> = {}) {
    const req = request(this.app).patch(url);
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    Object.entries(headers).forEach(([key, value]) => {
      req.set(key, value);
    });
    if (body) {
      req.send(body);
    }
    return req;
  }

  delete(url: string, headers: Record<string, string> = {}) {
    const req = request(this.app).delete(url);
    if (this.token) {
      req.set('Authorization', `Bearer ${this.token}`);
    }
    Object.entries(headers).forEach(([key, value]) => {
      req.set(key, value);
    });
    return req;
  }

  async authenticate(username: string, password: string): Promise<string> {
    const response = await this.post('/auth/login', { username, password });
    if (response.status !== 200) {
      throw new Error('Authentication failed');
    }
    this.token = response.body.token;
    return this.token;
  }
}

export function createApiHelper(app: Express): ApiHelper {
  return new ApiHelper(app);
}
