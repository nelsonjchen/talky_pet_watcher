// motion-listener/utils.ts

// Removes namespaces from the topic string.
export function stripNamespaces(topic: string): string {
  let output: string = '';
  let parts: string[] = topic.split('/')
  for (let index = 0; index < parts.length; index++) {
    let stringNoNamespace: string = parts[index].split(':').pop()
    if (output.length == 0) {
      output += stringNoNamespace
    } else {
      output += '/' + stringNoNamespace
    }
  }
  return output
}

// Processes the source part of the event message.
export function processSource(camMessage: any): { sourceName: string | null, sourceValue: string | null } {
  let sourceName: string | null = null;
  let sourceValue: string | null = null;

  // Check if source and simpleItem exist
  if (camMessage.message.message.source && camMessage.message.message.source.simpleItem) {
    // Handle array or single item
    if (Array.isArray(camMessage.message.message.source.simpleItem)) {
      sourceName = camMessage.message.message.source.simpleItem[0].$.Name;
      sourceValue = camMessage.message.message.source.simpleItem[0].$.Value;
    } else {
      sourceName = camMessage.message.message.source.simpleItem.$.Name;
      sourceValue = camMessage.message.message.source.simpleItem.$.Value;
    }
  }

  return { sourceName, sourceValue };
}