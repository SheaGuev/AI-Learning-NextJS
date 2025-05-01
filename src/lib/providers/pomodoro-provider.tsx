'use client';

import React, { createContext, useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useToast } from '@/lib/hooks/use-toast'; // Corrected import path for the hook

// Constants for timer durations (in seconds)
const WORK_DURATION = 25 * 60; // 25 minutes
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes
const SESSIONS_BEFORE_LONG_BREAK = 4;

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroContextType {
  timeLeft: number;
  isRunning: boolean;
  phase: PomodoroPhase;
  pomodorosCompleted: number;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<PomodoroPhase>('work');
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast(); // Get the toast function

  // Function to show browser notifications and toast
  const showNotificationAndToast = useCallback((message: string) => {
    // Browser Notification Logic
    if (!("Notification" in window)) {
      console.warn("Browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
      new Notification("Pomodoro Timer", { body: message });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("Pomodoro Timer", { body: message });
        }
      });
    }

    // Toast Notification Logic
    toast({
      title: "Pomodoro Timer",
      description: message,
    });
  }, [toast]); // Add toast to dependency array

  // Function to switch phases
  const switchPhase = useCallback(() => {
    let nextPhase: PomodoroPhase;
    let nextTimeLeft: number;
    let completed = pomodorosCompleted;
    let notificationMessage = "";

    if (phase === 'work') {
      completed++;
      setPomodorosCompleted(completed);
      if (completed % SESSIONS_BEFORE_LONG_BREAK === 0) {
        nextPhase = 'longBreak';
        nextTimeLeft = LONG_BREAK_DURATION;
        notificationMessage = "Work session finished! Time for a long break.";
      } else {
        nextPhase = 'shortBreak';
        nextTimeLeft = SHORT_BREAK_DURATION;
        notificationMessage = "Work session finished! Time for a short break.";
      }
    } else { // shortBreak or longBreak
      nextPhase = 'work';
      nextTimeLeft = WORK_DURATION;
      notificationMessage = "Break finished! Time for work.";
    }
    setPhase(nextPhase);
    setTimeLeft(nextTimeLeft);
    setIsRunning(false); // Pause timer after phase switch
    showNotificationAndToast(notificationMessage); // Use the combined function
  }, [phase, pomodorosCompleted, showNotificationAndToast]);

  // Effect to handle the interval timer
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start interval if not already running
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Time's up, switch phase
            switchPhase();
            // Return 0 to ensure timer hits 0 before switching visually
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    // Cleanup interval on component unmount or when isRunning changes to false
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, switchPhase]); // Re-run effect if isRunning or switchPhase changes

  // Timer control functions
  const startTimer = () => {
    // Request notification permission when the timer is first started by the user
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    setIsRunning(true);
  };

  const pauseTimer = () => setIsRunning(false);

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    setPhase('work');
    setTimeLeft(WORK_DURATION);
    // Optionally reset completed count, or keep it based on requirements
    // setPomodorosCompleted(0);
  };

  const skipPhase = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false); // Ensure timer stops

    // Determine the message for the skipped phase
    let skipMessage = "";
    const nextPhaseIsWork = phase !== 'work';
    if (phase === 'work') {
        const nextBreakType = (pomodorosCompleted + 1) % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'long break' : 'short break';
        skipMessage = `Work phase skipped! Starting ${nextBreakType}.`;
    } else {
        skipMessage = `${phase === 'shortBreak' ? 'Short break' : 'Long break'} skipped! Starting work phase.`;
    }
    showNotificationAndToast(skipMessage); // Show notification and toast

    switchPhase(); // Manually trigger phase switch logic (which will also show its own notification)
  };

  const value = {
    timeLeft,
    isRunning,
    phase,
    pomodorosCompleted,
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
};

// Custom hook to use the Pomodoro context
export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
};
