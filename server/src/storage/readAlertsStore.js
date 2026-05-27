import mongoose from 'mongoose';

const readAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  alertIds: [{ type: String }]
}, { timestamps: true });

export const ReadAlert = mongoose.model('ReadAlert', readAlertSchema);

export async function markAsRead(userId, alertId) {
  let record = await ReadAlert.findOne({ userId });
  if (!record) {
    record = new ReadAlert({ userId, alertIds: [alertId] });
  } else {
    if (!record.alertIds.includes(alertId)) {
      record.alertIds.push(alertId);
    }
  }
  await record.save();
}

export async function getReadAlerts(userId) {
  const record = await ReadAlert.findOne({ userId });
  return record ? record.alertIds : [];
}
