import { cn } from '../utils';

describe('utils', () => {
  describe('cn function', () => {
    it('should merge classes correctly', () => {
      // Test basic class merging
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
      
      // Test conditional classes
      const isActive = true;
      expect(cn('btn', isActive && 'btn-active')).toBe('btn btn-active');
      
      // Test with false/undefined conditions
      expect(cn('btn', false && 'hidden', undefined, 'flex')).toBe('btn flex');
      
      // Test with tailwind conflicts (tailwind-merge functionality)
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
      expect(cn('p-4', 'px-6')).toBe('p-4 px-6');
      expect(cn('p-4 px-8', 'py-6')).toBe('p-4 px-8 py-6');
    });
  });
}); 