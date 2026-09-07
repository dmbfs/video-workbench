import type { ProviderConfig } from "@vidstitch/shared";
import type { VideoProvider } from "./types.js";
import { MockProvider } from "./mock.js";
import { MiniMaxProvider } from "./minimax.js";
import { SeedanceProvider } from "./seedance.js";

export function getVideoProvider(cfg: ProviderConfig): VideoProvider {
  switch (cfg.kind) {
    case "mock": return new MockProvider();
    case "minimax": return new MiniMaxProvider(cfg);
    case "seedance": return new SeedanceProvider(cfg);
    default: throw new Error(`kind ${cfg.kind} 不是视频 provider`);
  }
}
