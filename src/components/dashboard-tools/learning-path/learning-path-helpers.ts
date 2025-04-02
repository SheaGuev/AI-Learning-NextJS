/**
 * Helper functions for the Learning Path Planner component
 */

/**
 * Extracts clean text content from Quill data storage formats
 * Handles both regular Quill deltas and our special markdown format
 */
export function extractContentFromFileData(fileData: string): string {
  if (!fileData) return '';
  
  try {
    const parsedData = JSON.parse(fileData);
    
    // Handle our special markdown format
    if (parsedData.markdown && parsedData.content) {
      return parsedData.content;
    }
    
    // Handle regular Quill delta format
    if (parsedData.ops) {
      // Extract only text from Quill delta ops
      return parsedData.ops
        .map((op: any) => op.insert || '')
        .join('');
    }
    
    // Fallback to stringifying the data
    return JSON.stringify(parsedData);
  } catch (err) {
    console.error('Error parsing file data:', err);
    return '';
  }
}

/**
 * Parses uploaded plain text/markdown content into a LearningPlan structure.
 * Assumes a structure like:
 * # Plan Title
 * Description...
 *
 * ## Module 1 Title / Week 1
 * Module Description...
 * Estimated Time: X hours
 *
 * ### Topic 1
 * - Subtopic 1
 * **Resources:**
 * - Resource 1
 * **Activities:**
 * - Activity 1
 *
 * ## Schedule (Optional)
 * ### Day 1 (Duration)
 * - Topic A
 */

// Define types locally since we don't have an external types file
interface LearningModuleStub {
  title: string;
  description: string;
  topics: LearningTopicStub[];
  estimatedTime: string;
}
interface LearningTopicStub {
  title: string;
  subtopics: string[];
  resources?: string[];
  activities?: string[];
}
interface StudySessionStub {
  day: string;
  topics: string[];
  duration: string;
}
interface LearningPlanStub {
  title: string;
  description: string;
  modules: LearningModuleStub[];
  schedule?: StudySessionStub[];
}

export function parseUploadedPlan(content: string): LearningPlanStub | null {
  if (!content) return null;
  
  const lines = content.split('\n').map(line => line.trim());
  let plan: Partial<LearningPlanStub> = { modules: [] };
  let currentModule: Partial<LearningModuleStub> | null = null;
  let currentTopic: Partial<LearningTopicStub> | null = null;
  let currentSection: 'description' | 'modules' | 'topics' | 'subtopics' | 'resources' | 'activities' | 'schedule' | null = null;
  let isParsingSchedule = false;
  let currentScheduleSession: Partial<StudySessionStub> | null = null;

  for (const line of lines) {
    if (line.startsWith('# ')) { // Plan Title
      plan.title = line.substring(2).trim();
      currentSection = 'description';
    } else if (line.startsWith('## ')) { // Module Title or Schedule Section
      // Finish previous module/topic
      if (currentTopic) {
        if (currentModule && currentModule.topics) currentModule.topics.push(currentTopic as LearningTopicStub);
        currentTopic = null;
      }
       if (currentModule) {
         if (plan.modules) plan.modules.push(currentModule as LearningModuleStub);
         currentModule = null;
       }
      // Finish previous schedule session
      if (currentScheduleSession) {
        if (!plan.schedule) plan.schedule = [];
        plan.schedule.push(currentScheduleSession as StudySessionStub);
        currentScheduleSession = null;
      }


      const header = line.substring(3).trim().toLowerCase();
      if (header === 'schedule') {
        isParsingSchedule = true;
        currentSection = 'schedule';
      } else {
        isParsingSchedule = false;
        currentModule = { title: line.substring(3).trim(), topics: [], description: '', estimatedTime: 'N/A' };
        currentSection = 'modules'; // Expect module description next
      }
    } else if (line.startsWith('### ')) { // Topic Title or Schedule Day
      // Finish previous topic
      if (currentTopic) {
          if (currentModule && currentModule.topics) currentModule.topics.push(currentTopic as LearningTopicStub);
          currentTopic = null;
      }
       // Finish previous schedule session
      if (currentScheduleSession) {
         if (!plan.schedule) plan.schedule = [];
         plan.schedule.push(currentScheduleSession as StudySessionStub);
         currentScheduleSession = null;
      }


      if (isParsingSchedule) {
        const scheduleHeader = line.substring(4).trim();
        const durationMatch = scheduleHeader.match(/\(([^)]+)\)/); // Extract duration like (2 hours)
        const day = durationMatch ? scheduleHeader.replace(durationMatch[0], '').trim() : scheduleHeader;
        currentScheduleSession = { day: day, duration: durationMatch ? durationMatch[1] : 'N/A', topics: [] };
        currentSection = 'schedule'; // Expect schedule topics
      } else if (currentModule) {
        currentTopic = { title: line.substring(4).trim(), subtopics: [], resources: [], activities: [] };
        currentSection = 'topics'; // Expect topic details or subtopics
      }
    } else if (line.startsWith('- ')) { // List item (Subtopic, Resource, Activity, Schedule Topic)
      const item = line.substring(2).trim();
      if (currentSection === 'subtopics' && currentTopic && currentTopic.subtopics) {
        currentTopic.subtopics.push(item);
      } else if (currentSection === 'resources' && currentTopic && currentTopic.resources) {
        currentTopic.resources.push(item);
      } else if (currentSection === 'activities' && currentTopic && currentTopic.activities) {
        currentTopic.activities.push(item);
      } else if (currentSection === 'schedule' && currentScheduleSession && currentScheduleSession.topics) {
         currentScheduleSession.topics.push(item);
      } else if (currentSection === 'topics' && currentTopic) {
         // Assume it's a subtopic if nothing else specified
         if (!currentTopic.subtopics) currentTopic.subtopics = [];
         currentTopic.subtopics.push(item);
         currentSection = 'subtopics';
      }
    } else if (line.toLowerCase().startsWith('estimated time:')) {
       if (currentModule) {
           currentModule.estimatedTime = line.substring('estimated time:'.length).trim();
       }
    } else if (line.toLowerCase().startsWith('**resources:**')) {
      if (currentTopic) currentSection = 'resources';
    } else if (line.toLowerCase().startsWith('**activities:**')) {
      if (currentTopic) currentSection = 'activities';
    } else if (line.length > 0) { // Assume description text
        if (currentSection === 'description' && !plan.description) {
            plan.description = line;
        } else if (currentSection === 'description' && plan.description) {
            plan.description += '\n' + line; // Append to description
        } else if (currentSection === 'modules' && currentModule) {
             currentModule.description = (currentModule.description ? currentModule.description + '\n' : '') + line;
        } else if (currentSection === 'topics' && currentTopic) {
            // Maybe append to topic description if we add that field? For now, ignore.
        }
    }
  }

  // Add the last processed items
  if (currentTopic && currentModule && currentModule.topics) {
    currentModule.topics.push(currentTopic as LearningTopicStub);
  }
  if (currentModule && plan.modules) {
    plan.modules.push(currentModule as LearningModuleStub);
  }
   if (currentScheduleSession && plan.schedule) {
      plan.schedule.push(currentScheduleSession as StudySessionStub);
   }


  // Basic validation: Ensure we have a title and at least one module
  if (plan.title && plan.modules && plan.modules.length > 0) {
    return plan as LearningPlanStub;
  }

  console.warn("Parsing failed: Could not extract minimum required fields (title, modules).");
  return null; // Parsing failed or incomplete
  }

// Local type definitions that mirror the ones in the planner component
interface LearningModule {
  title: string;
  description: string;
  topics: LearningTopic[];
  estimatedTime: string;
}
interface LearningTopic {
  title: string;
  subtopics: string[];
  resources?: string[];
  activities?: string[];
}
interface StudySession {
  day: string;
  topics: string[];
  duration: string;
}
interface LearningPlan {
  title: string;
  description: string;
  modules: LearningModule[];
  schedule?: StudySession[];
} 