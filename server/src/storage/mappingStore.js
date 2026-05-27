import mongoose from 'mongoose';

const mappingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trelloBoardId: { type: String, required: true },
  trelloCardId: { type: String, required: true },
  trelloCardUrl: { type: String },
  trelloListName: { type: String },
  jiraProjectKey: { type: String },
  jiraIssueId: { type: String },
  jiraIssueKey: { type: String },
  jiraIssueUrl: { type: String },
  jiraIssueApiUrl: { type: String }
}, { timestamps: true });

// Ensure unique mapping per user per card
mappingSchema.index({ userId: 1, trelloCardId: 1 }, { unique: true });

export const Mapping = mongoose.model('Mapping', mappingSchema);

export async function listMappings(userId) {
  return await Mapping.find(userId ? { userId } : {});
}

export async function findMappingByTrelloCardId(userId, trelloCardId) {
  return await Mapping.findOne({ userId, trelloCardId });
}

export async function saveMapping(userId, mappingData) {
  let mapping = await Mapping.findOne({ userId, trelloCardId: mappingData.trelloCardId });
  if (!mapping) {
    mapping = new Mapping({ userId, ...mappingData });
  } else {
    Object.assign(mapping, mappingData);
  }
  await mapping.save();
  return mapping;
}
