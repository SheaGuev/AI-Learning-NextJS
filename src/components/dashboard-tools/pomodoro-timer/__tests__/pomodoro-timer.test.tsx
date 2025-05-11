import React from 'react';
import { render, screen, act } from '@testing-library/react';
import PomodoroTimer from '../pomodoro-timer';
import { PomodoroProvider } from '@/lib/providers/pomodoro-provider'; // Adjust path if needed

// Mock the provider if it has complex logic or side effects, 
// or wrap the component for simple cases.
describe('PomodoroTimer Component Integration', () => {
  it('should render the initial work session time', () => {
    // Render the component within its provider using act
    act(() => {
      render(
        <PomodoroProvider>
          <PomodoroTimer />
        </PomodoroProvider>
      );
    });

    // Check if the default work time (e.g., 25:00) is displayed
    // Note: Adjust the expected time based on your WORK_DURATION constant
    expect(screen.getByText('25:00')).toBeInTheDocument(); 
    expect(screen.getByText('Work Session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
  });

  // Add more integration tests: clicking start/pause/reset, phase changes, etc.
}); 