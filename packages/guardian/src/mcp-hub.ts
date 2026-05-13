export interface McpServerDefinition {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface ClaudeDesktopConfig {
  mcpServers: Record<string, {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }>;
}

export class McpHub {
  private readonly servers = new Map<string, McpServerDefinition>();

  register(server: McpServerDefinition): void {
    this.servers.set(server.id, server);
  }

  unregister(serverId: string): void {
    this.servers.delete(serverId);
  }

  list(): McpServerDefinition[] {
    return [...this.servers.values()].filter((server) => server.enabled);
  }

  toClaudeDesktopConfig(): ClaudeDesktopConfig {
    const mcpServers: ClaudeDesktopConfig["mcpServers"] = {};
    for (const server of this.list()) {
      mcpServers[server.name] = {
        command: server.command,
        args: server.args,
        ...(server.env ? { env: server.env } : {})
      };
    }
    return { mcpServers };
  }
}
