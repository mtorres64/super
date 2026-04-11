import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from './App';

export const mockUser = {
  id: 1,
  nombre: 'Test User',
  email: 'test@test.com',
  rol: 'admin',
  branch_id: null,
};

export const mockUserWithBranch = {
  ...mockUser,
  branch_id: 2,
};

export const mockAuthContext = {
  user: mockUser,
  setUser: jest.fn(),
  logout: jest.fn(),
};

/**
 * Renders a component wrapped with MemoryRouter and AuthContext.
 * @param {React.ReactElement} ui
 * @param {{ user?, initialEntries?, authValue? }} options
 */
export function renderWithProviders(ui, {
  user = mockUser,
  initialEntries = ['/'],
  authValue,
} = {}) {
  const contextValue = authValue ?? { user, setUser: jest.fn(), logout: jest.fn() };
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={contextValue}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  );
}
