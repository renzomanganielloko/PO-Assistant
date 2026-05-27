import mongoose from 'mongoose';
import { Automation } from '../models/Automation.js';

export async function listAutomations(userId) {
  const automations = await Automation.find({ userId: new mongoose.Types.ObjectId(userId) });
  return automations.map(a => {
    const doc = a.toObject();
    doc.id = doc._id.toString();
    return doc;
  });
}

export async function getAutomation(userId, id) {
  const a = await Automation.findOne({ _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) });
  if (!a) return null;
  const doc = a.toObject();
  doc.id = doc._id.toString();
  return doc;
}

export async function findAutomationByBoardId(userId, trelloBoardId) {
  const a = await Automation.findOne({ userId: new mongoose.Types.ObjectId(userId), trelloBoardId });
  if (!a) return null;
  const doc = a.toObject();
  doc.id = doc._id.toString();
  return doc;
}

export async function upsertAutomation(userId, input) {
  const uId = new mongoose.Types.ObjectId(userId);
  let automation = await Automation.findOne({ userId: uId, trelloBoardId: input.trelloBoardId });
  
  if (!automation) {
    automation = new Automation({
      userId: uId,
      ...input,
      jiraProjectKey: (input.jiraProjectKey || '').trim().toUpperCase()
    });
  } else {
    if (input.enabled !== undefined) automation.enabled = input.enabled;
    if (input.trelloBoardName !== undefined) automation.trelloBoardName = input.trelloBoardName;
    if (input.trelloListId !== undefined) automation.trelloListId = input.trelloListId;
    if (input.trelloListName !== undefined) automation.trelloListName = input.trelloListName;
    if (input.jiraProjectKey !== undefined) automation.jiraProjectKey = input.jiraProjectKey.trim().toUpperCase();
    if (input.jiraIssueType !== undefined) automation.jiraIssueType = input.jiraIssueType;
    if (input.refineAI !== undefined) automation.refineAI = input.refineAI;
    if (input.favorite !== undefined) automation.favorite = input.favorite;
  }
  
  await automation.save();
  const doc = automation.toObject();
  doc.id = doc._id.toString();
  return doc;
}

export async function updateAutomationRun(userId, id, result) {
  const automation = await Automation.findOne({ _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) });
  if (!automation) return null;

  automation.lastRunAt = new Date();
  automation.lastResult = result;
  await automation.save();
  
  const doc = automation.toObject();
  doc.id = doc._id.toString();
  return doc;
}
