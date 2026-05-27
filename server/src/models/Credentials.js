import mongoose from 'mongoose';

const credentialsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  trelloApiKey: { type: String, default: '' },
  trelloToken: { type: String, default: '' },
  jiraBaseUrl: { type: String, default: '' },
  jiraEmail: { type: String, default: '' },
  jiraApiToken: { type: String, default: '' },
  geminiApiKey: { type: String, default: '' },
  googleTokens: { type: Object, default: null }
}, { timestamps: true });

export const Credentials = mongoose.model('Credentials', credentialsSchema);
