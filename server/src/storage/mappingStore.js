import mongoose from 'mongoose';
import { Mapping } from '../models/Mapping.js';

export async function listMappings(userId) {
  return await Mapping.find({ userId: new mongoose.Types.ObjectId(userId) });
}

export async function findMappingByTrelloCardId(userId, trelloCardId) {
  return await Mapping.findOne({ userId: new mongoose.Types.ObjectId(userId), trelloCardId });
}

export async function saveMapping(userId, mappingData) {
  const uId = new mongoose.Types.ObjectId(userId);
  let mapping = await Mapping.findOne({ userId: uId, trelloCardId: mappingData.trelloCardId });
  if (!mapping) {
    mapping = new Mapping({ userId: uId, ...mappingData });
  } else {
    Object.assign(mapping, mappingData);
  }
  await mapping.save();
  return mapping;
}
