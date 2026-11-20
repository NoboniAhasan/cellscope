import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Root and Disclaimer', () => {
  it('renders application with required diagnosis disclaimer', async () => {
    render(<App />);
    expect(
      await screen.findByText(/For educational\/research use\. Not for medical diagnosis\./i),
    ).toBeInTheDocument();
  });
});
