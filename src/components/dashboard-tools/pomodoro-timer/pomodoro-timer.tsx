'use client';

import React from 'react';
import { usePomodoro } from '@/lib/providers/pomodoro-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiPlayLine, RiPauseLine, RiRestartLine, RiSkipForwardLine } from 'react-icons/ri';

// Helper function to format time (MM:SS)
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Helper function to get phase display name
const getPhaseName = (phase: 'work' | 'shortBreak' | 'longBreak'): string => {
  switch (phase) {
    case 'work': return 'Work Session';
    case 'shortBreak': return 'Short Break';
    case 'longBreak': return 'Long Break';
    default: return 'Pomodoro';
  }
};

const PomodoroTimer: React.FC = () => {
  const {
    timeLeft,
    isRunning,
    phase,
    pomodorosCompleted,
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
  } = usePomodoro();

  return (
    <Card className="bg-[#282a36] border-[#4A4A67] text-white w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-[#8B5CF6] text-xl">
          {getPhaseName(phase)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <div className="text-7xl font-bold font-mono text-gray-100">
          {formatTime(timeLeft)}
        </div>
        <div className="flex space-x-4">
          {!isRunning ? (
            <Button
              onClick={startTimer}
              className="bg-[#6052A8] hover:bg-[#7C3AED] text-white px-6 py-3 rounded-lg flex items-center space-x-2"
              aria-label="Start Timer"
            >
              <RiPlayLine size={20} />
              <span>Start</span>
            </Button>
          ) : (
            <Button
              onClick={pauseTimer}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2"
              aria-label="Pause Timer"
            >
              <RiPauseLine size={20} />
              <span>Pause</span>
            </Button>
          )}
          <Button
            onClick={resetTimer}
            variant="outline"
            className="border-[#4A4A67] text-gray-300 hover:bg-[#2d2d3a] hover:text-white px-6 py-3 rounded-lg flex items-center space-x-2"
            aria-label="Reset Timer"
          >
            <RiRestartLine size={20} />
            <span>Reset</span>
          </Button>
           <Button
            onClick={skipPhase}
            variant="outline"
            className="border-[#4A4A67] text-gray-300 hover:bg-[#2d2d3a] hover:text-white px-6 py-3 rounded-lg flex items-center space-x-2"
            aria-label="Skip Phase"
            title="Skip to next phase"
          >
            <RiSkipForwardLine size={20} />
            <span>Skip</span>
          </Button>
        </div>
        <div className="text-sm text-gray-400">
          Completed Pomodoros: {pomodorosCompleted}
        </div>
      </CardContent>
    </Card>
  );
};

export default PomodoroTimer;

