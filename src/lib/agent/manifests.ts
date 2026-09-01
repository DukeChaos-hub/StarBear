import { allToolDescriptors, type ToolDescriptor } from './tools';

export interface AgentManifest {
  version: string;
  name: 'starbear-agent';
  tools: ToolDescriptor[];
}

export function buildManifest(): AgentManifest {
  return { version: '1.0.0', name: 'starbear-agent', tools: allToolDescriptors };
}
