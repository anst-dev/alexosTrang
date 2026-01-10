/**
 * Test script for Export/Import functionality
 * Run with: npx tsx services/exportImport.test.ts
 */

import {
  exportGoalsToCSV,
  exportHabitsToCSV,
  exportJournalToCSV,
  exportToJSON,
  importGoalsFromCSV,
  importHabitsFromCSV,
  importJournalFromCSV,
  importFromJSON,
} from './exportImport';
import { Goal, Habit, JournalEntry } from '../types';

// Mock document for Node.js environment
const mockDownloads: { filename: string; content: string }[] = [];

// Mock createElement and related DOM functions
const originalCreateElement = global.document?.createElement;

if (typeof window === 'undefined') {
  // Node.js environment - mock browser APIs
  (global as any).URL = {
    createObjectURL: (blob: Blob) => `blob:mock-${Date.now()}`,
    revokeObjectURL: () => {},
  };
  
  (global as any).document = {
    createElement: (tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: function() {
            mockDownloads.push({ filename: this.download, content: 'mock' });
            console.log(`📥 Mock download: ${this.download}`);
          },
        };
      }
      return {};
    },
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
  };

  (global as any).Blob = class MockBlob {
    private parts: string[];
    constructor(parts: string[], options?: { type?: string }) {
      this.parts = parts;
    }
    async text() {
      return this.parts.join('');
    }
  };
}

// Test Data
const testGoals: Goal[] = [
  {
    id: '1',
    title: 'Learn TypeScript',
    category: 'Học tập',
    progress: 75,
    deadline: '2025-06-30',
    colorClass: 'bg-neo-blue',
    image: 'https://example.com/ts.png',
    notes: 'Focus on advanced types',
    milestones: [
      { id: 'm1', title: 'Basic types', completed: true },
      { id: 'm2', title: 'Generics', completed: false, dueDate: '2025-03-15' },
    ],
    createdAt: Date.now(),
  },
  {
    id: '2',
    title: 'Run 10km',
    category: 'Sức khỏe',
    progress: 30,
    deadline: '2025-12-31',
    colorClass: 'bg-neo-lime',
    image: '',
    milestones: [],
    createdAt: Date.now() - 86400000,
  },
];

const testHabits: Habit[] = [
  {
    id: '1',
    name: 'Morning exercise',
    category: 'Sức khỏe',
    streak: 15,
    completedToday: true,
    lastCompletedDate: new Date().toDateString(),
    linkedGoalId: '2',
  },
  {
    id: '2',
    name: 'Read 30 minutes',
    category: 'Học tập',
    streak: 7,
    completedToday: false,
    lastCompletedDate: null,
  },
];

const testJournal: JournalEntry[] = [
  {
    id: '1',
    createdAt: Date.now(),
    content: 'Today was productive. Learned about TypeScript generics.',
    mood: '😊',
    linkedGoalId: '1',
  },
  {
    id: '2',
    createdAt: Date.now() - 86400000,
    content: 'Went for a morning run. Feeling great!',
    mood: '💪',
  },
];

// ============================================
// TEST FUNCTIONS
// ============================================

async function testExportJSON() {
  console.log('\n📤 Testing JSON Export...');
  try {
    exportToJSON({
      goals: testGoals,
      habits: testHabits,
      journalEntries: testJournal,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    });
    console.log('✅ JSON Export: PASSED');
    return true;
  } catch (error) {
    console.error('❌ JSON Export: FAILED', error);
    return false;
  }
}

async function testExportCSV() {
  console.log('\n📤 Testing CSV Export...');
  try {
    exportGoalsToCSV(testGoals);
    exportHabitsToCSV(testHabits);
    exportJournalToCSV(testJournal);
    console.log('✅ CSV Export: PASSED');
    return true;
  } catch (error) {
    console.error('❌ CSV Export: FAILED', error);
    return false;
  }
}

async function testImportGoalsCSV() {
  console.log('\n📥 Testing Goals CSV Import...');
  
  const csvContent = `title,category,deadline,progress,colorClass,notes
"Learn React","Học tập","2025-12-31",50,"bg-neo-purple","Focus on hooks"
"Build Portfolio","Sự nghiệp","2025-06-30",20,"bg-neo-orange",""`;

  const mockFile = new Blob([csvContent], { type: 'text/csv' }) as unknown as File;
  Object.defineProperty(mockFile, 'name', { value: 'goals.csv' });
  (mockFile as any).text = async () => csvContent;

  try {
    const result = await importGoalsFromCSV(mockFile as File);
    
    if (result.success && result.data && result.data.goals.length === 2) {
      console.log(`✅ Goals Import: PASSED (imported ${result.data.goals.length} goals)`);
      console.log('   First goal:', result.data.goals[0].title);
      return true;
    } else {
      console.error('❌ Goals Import: FAILED', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Goals Import: FAILED', error);
    return false;
  }
}

async function testImportHabitsCSV() {
  console.log('\n📥 Testing Habits CSV Import...');
  
  const csvContent = `name,category,streak,linkedGoalId
"Drink water","Sức khỏe",10,""
"Meditation","Tinh thần",5,"1"`;

  const mockFile = new Blob([csvContent], { type: 'text/csv' }) as unknown as File;
  Object.defineProperty(mockFile, 'name', { value: 'habits.csv' });
  (mockFile as any).text = async () => csvContent;

  try {
    const result = await importHabitsFromCSV(mockFile as File);
    
    if (result.success && result.data && result.data.habits.length === 2) {
      console.log(`✅ Habits Import: PASSED (imported ${result.data.habits.length} habits)`);
      console.log('   First habit:', result.data.habits[0].name);
      return true;
    } else {
      console.error('❌ Habits Import: FAILED', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Habits Import: FAILED', error);
    return false;
  }
}

async function testImportJournalCSV() {
  console.log('\n📥 Testing Journal CSV Import...');
  
  const csvContent = `content,mood,linkedGoalId
"Had a great day learning new things","😊","1"
"Feeling tired but accomplished","😌",""`;

  const mockFile = new Blob([csvContent], { type: 'text/csv' }) as unknown as File;
  Object.defineProperty(mockFile, 'name', { value: 'journal.csv' });
  (mockFile as any).text = async () => csvContent;

  try {
    const result = await importJournalFromCSV(mockFile as File);
    
    if (result.success && result.data && result.data.journalEntries.length === 2) {
      console.log(`✅ Journal Import: PASSED (imported ${result.data.journalEntries.length} entries)`);
      console.log('   First entry mood:', result.data.journalEntries[0].mood);
      return true;
    } else {
      console.error('❌ Journal Import: FAILED', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Journal Import: FAILED', error);
    return false;
  }
}

async function testImportJSON() {
  console.log('\n📥 Testing JSON Import...');
  
  const jsonContent = JSON.stringify({
    goals: testGoals,
    habits: testHabits,
    journalEntries: testJournal,
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  });

  const mockFile = new Blob([jsonContent], { type: 'application/json' }) as unknown as File;
  Object.defineProperty(mockFile, 'name', { value: 'backup.json' });
  (mockFile as any).text = async () => jsonContent;

  try {
    const result = await importFromJSON(mockFile as File);
    
    if (result.success && result.data) {
      console.log(`✅ JSON Import: PASSED`);
      console.log(`   Goals: ${result.data.goals.length}, Habits: ${result.data.habits.length}, Journal: ${result.data.journalEntries.length}`);
      return true;
    } else {
      console.error('❌ JSON Import: FAILED', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ JSON Import: FAILED', error);
    return false;
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log('🧪 Starting Export/Import Tests...\n');
  console.log('='.repeat(50));
  
  const results = {
    exportJSON: await testExportJSON(),
    exportCSV: await testExportCSV(),
    importGoalsCSV: await testImportGoalsCSV(),
    importHabitsCSV: await testImportHabitsCSV(),
    importJournalCSV: await testImportJournalCSV(),
    importJSON: await testImportJSON(),
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY:');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${test}: ${status}`);
    if (result) passed++;
    else failed++;
  }
  
  console.log('='.repeat(50));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }
}

// Run tests
runAllTests().catch(console.error);
