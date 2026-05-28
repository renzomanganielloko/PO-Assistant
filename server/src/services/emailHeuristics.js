
export function analyzeEmail(email) {
  const content = `${email.subject} ${email.snippet} ${email.body || ''}`.toLowerCase();
  
  // LOG EVERYTHING TO BE SURE
  console.log(`[DEBUG] Analyzing subject: ${email.subject}`);
  
  const analysis = {
    priorityScore: 0,
    categories: ['Needs Attention'], // ALWAYS ADD FOR DEBUGGING
    badges: [{ label: 'Blocker', color: 'red', icon: '🔴' }], // ALWAYS ADD FOR DEBUGGING
    deadlines: [],
    jiraIds: [],
    isUnread: true,
    project: 'DEBUG'
  };

  return analysis;
}
