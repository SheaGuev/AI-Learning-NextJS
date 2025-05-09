import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardTools from '../dashboard-tools'; // Adjust path as necessary

// Mock the individual tool components
jest.mock('@/components/dashboard-tools/ai-tutor/ai-tutor', () => () => <div data-testid="ai-tutor-mock">AI Tutor Mock</div>);
jest.mock('@/components/dashboard-tools/learning-path/learning-path-planner', () => ({
  LearningPathPlanner: () => <div data-testid="learning-path-mock">Learning Path Mock</div>
}));
jest.mock('@/components/dashboard-tools/research/research-tool', () => () => <div data-testid="research-mock">Research Tool Mock</div>);
jest.mock('@/components/dashboard-tools/knowledge-base/knowledge-base-dashboard', () => () => <div data-testid="knowledge-base-mock">Knowledge Base Mock</div>);
jest.mock('@/components/dashboard-tools/pomodoro-timer/pomodoro-timer', () => () => <div data-testid="pomodoro-timer-mock">Pomodoro Timer Mock</div>);

describe('DashboardTools Component', () => {
  it('should render all tool cards', () => {
    render(<DashboardTools />);

    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
    expect(screen.getByText('Learning Path Planner')).toBeInTheDocument();
    expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
    // expect(screen.getByText('Research Tool')).toBeInTheDocument(); // Currently commented out in component
    // expect(screen.getByText('Flashcards & Quiz')).toBeInTheDocument(); // Currently commented out in component
  });

  it('should not render any tool component initially', () => {
    render(<DashboardTools />);

    expect(screen.queryByTestId('knowledge-base-mock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('learning-path-mock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-tutor-mock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pomodoro-timer-mock')).not.toBeInTheDocument();
    // expect(screen.queryByTestId('research-mock')).not.toBeInTheDocument();
  });

  it('should render the Knowledge Base tool when its card is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardTools />);

    const knowledgeBaseCard = screen.getByText('Knowledge Base').closest('div[class*="cursor-pointer"]');
    expect(knowledgeBaseCard).toBeInTheDocument();

    if (knowledgeBaseCard) {
        await user.click(knowledgeBaseCard);
        expect(await screen.findByTestId('knowledge-base-mock')).toBeInTheDocument();
        // Check others are not rendered
        expect(screen.queryByTestId('learning-path-mock')).not.toBeInTheDocument();
        expect(screen.queryByTestId('ai-tutor-mock')).not.toBeInTheDocument();
        expect(screen.queryByTestId('pomodoro-timer-mock')).not.toBeInTheDocument();
    }
  });

   it('should render the AI Tutor tool when its card is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardTools />);

    const aiTutorCard = screen.getByText('AI Tutor').closest('div[class*="cursor-pointer"]');
    expect(aiTutorCard).toBeInTheDocument();

    if (aiTutorCard) {
        await user.click(aiTutorCard);
        expect(await screen.findByTestId('ai-tutor-mock')).toBeInTheDocument();
         // Check others are not rendered
        expect(screen.queryByTestId('knowledge-base-mock')).not.toBeInTheDocument();
        expect(screen.queryByTestId('learning-path-mock')).not.toBeInTheDocument();
        expect(screen.queryByTestId('pomodoro-timer-mock')).not.toBeInTheDocument();
    }
  });

  it('should hide the active tool when its card is clicked again', async () => {
    const user = userEvent.setup();
    render(<DashboardTools />);

    const pomodoroCard = screen.getByText('Pomodoro Timer').closest('div[class*="cursor-pointer"]');
    expect(pomodoroCard).toBeInTheDocument();

    if(pomodoroCard){
         // First click: show the tool
        await user.click(pomodoroCard);
        expect(await screen.findByTestId('pomodoro-timer-mock')).toBeInTheDocument();

        // Second click: hide the tool
        await user.click(pomodoroCard);
        expect(screen.queryByTestId('pomodoro-timer-mock')).not.toBeInTheDocument();
    }

  });

   it('should switch the active tool when a different card is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardTools />);

    const learningPathCard = screen.getByText('Learning Path Planner').closest('div[class*="cursor-pointer"]');
    const aiTutorCard = screen.getByText('AI Tutor').closest('div[class*="cursor-pointer"]');
    expect(learningPathCard).toBeInTheDocument();
    expect(aiTutorCard).toBeInTheDocument();

   if(learningPathCard && aiTutorCard) {
     // Click Learning Path first
     await user.click(learningPathCard);
     expect(await screen.findByTestId('learning-path-mock')).toBeInTheDocument();
     expect(screen.queryByTestId('ai-tutor-mock')).not.toBeInTheDocument();
 
     // Click AI Tutor next
     await user.click(aiTutorCard);
     expect(await screen.findByTestId('ai-tutor-mock')).toBeInTheDocument();
     expect(screen.queryByTestId('learning-path-mock')).not.toBeInTheDocument();
   }
   });

}); 