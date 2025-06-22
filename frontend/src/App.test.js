import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the auth service
jest.mock('./services/authService', () => ({
  getCurrentUserTokens: jest.fn(() => null),
  getUserInfo: jest.fn(() => null),
}));

describe('App Component', () => {
  test('renders app without crashing', () => {
    render(<App />);
  });

  test('renders navigation', () => {
    render(<App />);
    
    // Check for navigation elements
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
