import mongoose from 'mongoose';

const alertsConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  monitoredBoardIds: [{ type: String }]
}, { timestamps: true });

export const AlertsConfig = mongoose.model('AlertsConfig', alertsConfigSchema);

export async function getAlertsConfig(userId) {
  const config = await AlertsConfig.findOne({ userId });
  return config || { monitoredBoardIds: [] };
}

export async function saveAlertsConfig(userId, configData) {
  let config = await AlertsConfig.findOne({ userId });
  if (!config) {
    config = new AlertsConfig({ userId, ...configData });
  } else {
    Object.assign(config, configData);
  }
  await config.save();
  return config;
}
