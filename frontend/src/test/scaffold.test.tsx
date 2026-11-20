import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('CellScope scaffold verification', () => {
  it('renders application title and footer diagnosis disclaimer', () => {
    render(<App />);
    expect(screen.getByText('CellScope')).toBeInTheDocument();
    expect(
      screen.getByText(/For educational\/research use\. Not for medical diagnosis\./i)
    ).toBeInTheDocument();
  });
});
