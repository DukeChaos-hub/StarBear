// Re-export the real repository under the old path so existing imports keep working.
export {
  get as getSettings,
  save as saveSettings,
  type Settings as AiSettings,
  type SaveInput,
} from './repositories/ai-settings';
