import mongoose from 'mongoose';

const automationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enabled: { type: Boolean, default: true },
  trelloBoardId: { type: String, required: true },
  trelloBoardName: { type: String, required: true },
  trelloListId: { type: String, default: '' },
  trelloListName: { type: String, default: '' },
  jiraProjectKey: { type: String, default: '' },
  jiraIssueType: { type: String, default: 'Story' },
  refineAI: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  lastRunAt: { type: Date, default: null },
  lastResult: { type: Object, default: null }
}, { timestamps: true });

// A user should only have one automation per board
automationSchema.index({ userId: 1, trelloBoardId: 1 }, { unique: true });

export const Automation = mongoose.model('Automation', automationSchema);
