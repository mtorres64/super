import '@testing-library/jest-dom';

// Define la URL del backend para que los componentes construyan correctamente
// la constante API = `${REACT_APP_BACKEND_URL}/api` durante los tests.
process.env.REACT_APP_BACKEND_URL = 'http://localhost:8000';

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue({
    connect: jest.fn(),
    frequency: { value: 0 },
    type: 'sine',
    gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
    start: jest.fn(),
    stop: jest.fn(),
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    },
  }),
  destination: {},
  currentTime: 0,
}));
global.webkitAudioContext = global.AudioContext;

// Mock window.print
window.print = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();
window.HTMLElement.prototype.scrollTo = jest.fn();

// Suppress console.error for known non-critical warnings in tests
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('act(') ||
        args[0].includes('not wrapped in act'))
    ) {
      return;
    }
    originalError(...args);
  };
});
afterEach(() => {
  console.error = originalError;
});
