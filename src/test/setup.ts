// Global test setup: jest-dom matchers (toBeInTheDocument, etc.) + auto-cleanup.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
