export interface LearningProfile {
  name: string;
  learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  goals: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  subject: string;
  specificTopics?: string;
  importantTopics?: string;
  uploadedFile?: { name: string, dataUrl: string, mimeType: string };
}

export interface LearningStep {
  title: string;
  content: string;
  method: string;
  difficulty: string;
  estimatedTime: string;
  resourceLink?: string;
  resourceType?: 'youtube' | 'course' | 'article';
  youtubeVideos?: { title: string; url: string; channel: string }[];
  codingProblems?: { title: string; url: string; platform: string }[];
}

export interface LearningPath {
  subject: string;
  roadmapOverview?: string;
  steps: LearningStep[];
}

export interface ScheduleItem {
  time: string;
  activity: string;
  type: 'learning' | 'break' | 'focus' | 'rest';
}

export interface DailySchedule {
  day: string;
  items: ScheduleItem[];
}

export interface StudyNotes {
  title: string;
  summary: string;
  introduction: string;
  keyConcepts: { 
    concept: string;
    explanation: string;
    examples: {
      description: string;
      code?: string;
      contentType?: 'code' | 'equation' | 'reaction';
      codeExplanation?: string;
    }[]
  }[];
  detailedBreakdown: string;
  mainExampleCode?: string;
  mainExampleContentType?: 'code' | 'equation' | 'reaction';
  mainExampleExplanation?: string;
  qa: { question: string; answer: string }[];
  codingProblems?: { title: string; url: string; difficulty: 'Easy' | 'Medium' | 'Hard'; platform: string }[];
  suggestedSources: { name: string; type: string; url: string }[];
}

export interface AssessmentQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Assessment {
  title: string;
  questions: AssessmentQuestion[];
}

async function apiCall(endpoint: string, body: any) {
  const res = await fetch(`/api/gemini/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API call failed');
  }
  return res.json();
}

export async function* solveDoubtStream(context: string, userMessage: string, history: { role: string, content: string }[], mode: 'teaching' | 'navigator' = 'teaching') {
  const res = await fetch('/api/gemini/solveDoubtStream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, userMessage, history, mode })
  });

  if (!res.ok) throw new Error('Failed to start stream');
  if (!res.body) throw new Error('No stream body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }
}

export async function regenerateBlueprint(profile: LearningProfile): Promise<string> {
  const data = await apiCall('regenerateBlueprint', profile);
  return data.text;
}

export async function generateLearningPath(profile: LearningProfile): Promise<LearningPath> {
  return apiCall('generatePath', profile);
}

export async function regenerateStepsFromBlueprint(blueprint: string, existingSteps?: LearningStep[]): Promise<LearningStep[]> {
  return apiCall('regenerateSteps', { blueprint, existingSteps });
}

export async function adaptContent(step: LearningStep, feedback: string): Promise<LearningStep> {
  return apiCall('adaptContent', { step, feedback });
}

export async function generateSchedule(profile: LearningProfile, goals: string, selectedModules?: string[], studyDuration?: string): Promise<DailySchedule> {
  return apiCall('generateSchedule', { profile, goals, selectedModules, studyDuration });
}

export async function generateStudyNotes(subject: string, level: string): Promise<StudyNotes> {
  return apiCall('generateStudyNotes', { subject, level });
}

export async function generateAssessment(subject: string, level: string, notesContext: string, isSecondAttempt: boolean = false): Promise<Assessment> {
  return apiCall('generateAssessment', { subject, level, notesContext, isSecondAttempt });
}

export async function summarizeContent(content: string, depth: string, file?: { data: string, mimeType: string }): Promise<string> {
  const data = await apiCall('summarize', { content, depth, file });
  return data.text;
}

export async function scheduleStudyPlan(module: string, hours: string, days: string, context: string): Promise<string> {
  const data = await apiCall('schedulePlan', { module, hours, days, context });
  return data.text;
}

export async function analyzeResume(dataUrl: string, mimeType: string): Promise<{ about: string, skills: string[] }> {
  return apiCall('analyzeResume', { data: dataUrl, mimeType });
}

export async function mentorChat(history: { role: string, text: string }[], currentBlueprint: string): Promise<any> {
    return apiCall('mentorChat', { history, currentBlueprint });
}

export async function assistantChat(history: { role: string, text: string }[], context: string): Promise<any> {
    return apiCall('assistantChat', { history, context });
}
