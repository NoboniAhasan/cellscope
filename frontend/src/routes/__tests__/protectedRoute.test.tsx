import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthProvider } from '../../features/auth/AuthContext';
import { mockStorage } from '../../services/mock/storage';

describe('Protected Routes Redirect Logic', () => {
  it('redirects unauthenticated user to /login', async () => {
    mockStorage.setAuth(null);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<div>Login Page Target</div>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Login Page Target')).toBeInTheDocument();
    expect(screen.queryByText('Secret Dashboard Content')).not.toBeInTheDocument();
  });

  it('allows access when user is authenticated with correct role', async () => {
    mockStorage.setAuth({
      token: 'test-token',
      user: {
        id: 99,
        name: 'Test Researcher',
        email: 'test@res.org',
        role: 'researcher',
        createdAt: new Date().toISOString(),
      },
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<div>Login Page Target</div>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['researcher']}>
                  <div>Secret Dashboard Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Secret Dashboard Content')).toBeInTheDocument();
  });
});
