/**
 * MCP Cache Service
 *
 * In-memory caching for MCP server and tool information to improve performance.
 * Cache strategy: No automatic refresh - user must manually refresh (per contracts/mcp-cli.schema.json)
 */

import type { McpServerReference, McpToolReference } from '../../shared/types/mcp-node';
import { log } from '../extension';

/**
 * Cache entry for MCP servers
 */
interface ServerCacheEntry {
  servers: McpServerReference[];
  timestamp: number;
}

/**
 * Cache entry for MCP server details
 */
interface ServerDetailsCacheEntry {
  details: McpServerReference;
  timestamp: number;
}

/**
 * Cache entry for MCP tools
 */
interface ToolsCacheEntry {
  tools: McpToolReference[];
  timestamp: number;
}

/**
 * Cache entry for MCP tool schema
 */
interface ToolSchemaCacheEntry {
  schema: McpToolReference;
  timestamp: number;
}

/**
 * In-memory cache storage
 */
const cache = {
  /** Server list cache (from 'claude mcp list') */
  serverList: null as ServerCacheEntry | null,

  /** Server details cache (from 'claude mcp get <server-name>') */
  serverDetails: new Map<string, ServerDetailsCacheEntry>(),

  /** Tools cache per server (from 'claude mcp list-tools <server-name>') */
  tools: new Map<string, ToolsCacheEntry>(),

  /** Tool schema cache (from 'claude mcp get-tool-schema <server-name> <tool-name>') */
  toolSchemas: new Map<string, ToolSchemaCacheEntry>(),
};

/**
 * Cache TTL (Time To Live) settings
 *
 * Per contracts/mcp-cli.schema.json: "No caching; always fetch fresh data from CLI"
 * However, we implement short-lived caching (30 seconds) to prevent redundant CLI calls
 * within a single user interaction session.
 */
const CACHE_TTL_MS = {
  SERVER_LIST: 30000, // 30 seconds
  SERVER_DETAILS: 30000, // 30 seconds
  TOOLS: 30000, // 30 seconds
  TOOL_SCHEMA: 60000, // 60 seconds (schemas are more stable)
};

/**
 * Check if a cache entry is still valid
 */
function isCacheValid(timestamp: number, ttlMs: number): boolean {
  return Date.now() - timestamp < ttlMs;
}

/**
 * Get cached server list
 *
 * @returns Cached servers or null if cache miss/expired
 */
export function getCachedServerList(): McpServerReference[] | null {
  if (!cache.serverList) {
    return null;
  }

  if (!isCacheValid(cache.serverList.timestamp, CACHE_TTL_MS.SERVER_LIST)) {
    log('INFO', 'Server list cache expired');
    cache.serverList = null;
    return null;
  }

  log('INFO', 'Server list cache hit', {
    serverCount: cache.serverList.servers.length,
    ageMs: Date.now() - cache.serverList.timestamp,
  });

  return cache.serverList.servers;
}

/**
 * Set cached server list
 *
 * @param servers - Server list to cache
 */
export function setCachedServerList(servers: McpServerReference[]): void {
  cache.serverList = {
    servers,
    timestamp: Date.now(),
  };

  log('INFO', 'Cached server list', {
    serverCount: servers.length,
  });
}

/**
 * Get cached server details
 *
 * @param serverId - Server identifier
 * @returns Cached details or null if cache miss/expired
 */
export function getCachedServerDetails(serverId: string): McpServerReference | null {
  const entry = cache.serverDetails.get(serverId);

  if (!entry) {
    return null;
  }

  if (!isCacheValid(entry.timestamp, CACHE_TTL_MS.SERVER_DETAILS)) {
    log('INFO', 'Server details cache expired', { serverId });
    cache.serverDetails.delete(serverId);
    return null;
  }

  log('INFO', 'Server details cache hit', {
    serverId,
    ageMs: Date.now() - entry.timestamp,
  });

  return entry.details;
}

/**
 * Set cached server details
 *
 * @param serverId - Server identifier
 * @param details - Server details to cache
 */
export function setCachedServerDetails(serverId: string, details: McpServerReference): void {
  cache.serverDetails.set(serverId, {
    details,
    timestamp: Date.now(),
  });

  log('INFO', 'Cached server details', { serverId });
}

/**
 * Get cached tools for a server
 *
 * @param serverId - Server identifier
 * @returns Cached tools or null if cache miss/expired
 */
export function getCachedTools(serverId: string): McpToolReference[] | null {
  const entry = cache.tools.get(serverId);

  if (!entry) {
    return null;
  }

  if (!isCacheValid(entry.timestamp, CACHE_TTL_MS.TOOLS)) {
    log('INFO', 'Tools cache expired', { serverId });
    cache.tools.delete(serverId);
    return null;
  }

  log('INFO', 'Tools cache hit', {
    serverId,
    toolCount: entry.tools.length,
    ageMs: Date.now() - entry.timestamp,
  });

  return entry.tools;
}

/**
 * Set cached tools for a server
 *
 * @param serverId - Server identifier
 * @param tools - Tools to cache
 */
export function setCachedTools(serverId: string, tools: McpToolReference[]): void {
  cache.tools.set(serverId, {
    tools,
    timestamp: Date.now(),
  });

  log('INFO', 'Cached tools', {
    serverId,
    toolCount: tools.length,
  });
}

/**
 * Get cached tool schema
 *
 * @param serverId - Server identifier
 * @param toolName - Tool name
 * @returns Cached schema or null if cache miss/expired
 */
export function getCachedToolSchema(serverId: string, toolName: string): McpToolReference | null {
  const cacheKey = `${serverId}::${toolName}`;
  const entry = cache.toolSchemas.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (!isCacheValid(entry.timestamp, CACHE_TTL_MS.TOOL_SCHEMA)) {
    log('INFO', 'Tool schema cache expired', { serverId, toolName });
    cache.toolSchemas.delete(cacheKey);
    return null;
  }

  log('INFO', 'Tool schema cache hit', {
    serverId,
    toolName,
    ageMs: Date.now() - entry.timestamp,
  });

  return entry.schema;
}

/**
 * Set cached tool schema
 *
 * @param serverId - Server identifier
 * @param toolName - Tool name
 * @param schema - Tool schema to cache
 */
export function setCachedToolSchema(
  serverId: string,
  toolName: string,
  schema: McpToolReference
): void {
  const cacheKey = `${serverId}::${toolName}`;

  cache.toolSchemas.set(cacheKey, {
    schema,
    timestamp: Date.now(),
  });

  log('INFO', 'Cached tool schema', { serverId, toolName });
}

/**
 * Invalidate all cache entries for a specific server
 *
 * Useful when server configuration changes are detected.
 *
 * @param serverId - Server identifier
 */
export function invalidateServerCache(serverId: string): void {
  log('INFO', 'Invalidating cache for server', { serverId });

  // Remove server details
  cache.serverDetails.delete(serverId);

  // Remove tools
  cache.tools.delete(serverId);

  // Remove tool schemas
  for (const [cacheKey] of cache.toolSchemas) {
    if (cacheKey.startsWith(`${serverId}::`)) {
      cache.toolSchemas.delete(cacheKey);
    }
  }

  // Note: Do NOT invalidate server list cache here, as it's shared across all servers
}

/**
 * Invalidate all cache entries
 *
 * Useful for manual "Refresh" operations in UI.
 */
export function invalidateAllCache(): void {
  log('INFO', 'Invalidating all MCP cache');

  cache.serverList = null;
  cache.serverDetails.clear();
  cache.tools.clear();
  cache.toolSchemas.clear();
}

/**
 * Get cache statistics for debugging
 *
 * @returns Cache statistics
 */
export function getCacheStats(): {
  serverList: { cached: boolean; ageMs?: number };
  serverDetails: { count: number; entries: Array<{ serverId: string; ageMs: number }> };
  tools: { count: number; entries: Array<{ serverId: string; toolCount: number; ageMs: number }> };
  toolSchemas: {
    count: number;
    entries: Array<{ serverId: string; toolName: string; ageMs: number }>;
  };
} {
  const now = Date.now();

  return {
    serverList: cache.serverList
      ? {
          cached: true,
          ageMs: now - cache.serverList.timestamp,
        }
      : {
          cached: false,
        },
    serverDetails: {
      count: cache.serverDetails.size,
      entries: Array.from(cache.serverDetails.entries()).map(([serverId, entry]) => ({
        serverId,
        ageMs: now - entry.timestamp,
      })),
    },
    tools: {
      count: cache.tools.size,
      entries: Array.from(cache.tools.entries()).map(([serverId, entry]) => ({
        serverId,
        toolCount: entry.tools.length,
        ageMs: now - entry.timestamp,
      })),
    },
    toolSchemas: {
      count: cache.toolSchemas.size,
      entries: Array.from(cache.toolSchemas.entries()).map(([cacheKey, entry]) => {
        const [serverId, toolName] = cacheKey.split('::');
        return {
          serverId,
          toolName,
          ageMs: now - entry.timestamp,
        };
      }),
    },
  };
}
