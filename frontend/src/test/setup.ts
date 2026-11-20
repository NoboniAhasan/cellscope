import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// In-memory localStorage polyfill for Node test environments
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockLocalStorage = new LocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
}

// Polyfill Blob.prototype.text for jsdom
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

// Mock react-konva and konva for Vitest/jsdom headless environment using React.createElement
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'konva-stage', ...props }, children),
  Layer: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'konva-layer' }, children),
  Image: (props: any) =>
    React.createElement('div', { 'data-testid': 'konva-image', ...props }),
  Line: (props: any) =>
    React.createElement('div', { 'data-testid': 'konva-line', ...props }),
  Rect: (props: any) =>
    React.createElement('div', { 'data-testid': 'konva-rect', ...props }),
  Circle: (props: any) =>
    React.createElement('div', { 'data-testid': 'konva-circle', ...props }),
}));

vi.mock('konva', () => ({
  default: {},
}));
