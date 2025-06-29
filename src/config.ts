import { Bridge } from "./lib/bridge";
import { Client } from "./lib/client";
import { Model } from "./models/chat";

interface backgroundConfig {
  url: string;
}

interface backgroundPackConfig {
  [packName: string]: backgroundConfig[];
}

interface config {
  title: string;

  models: modelConfig[];
  backgrounds?: backgroundPackConfig;
  
  tts?: ttsConfig;
  stt?: sttConfig;
  voice?: voiceConfig;
  
  bridge?: bridgeConfig;
}

interface modelConfig {
  id: string;
  name: string;

  description?: string;
}

interface ttsConfig {
  enabled: boolean;
}

interface sttConfig {
   enabled: boolean;
}

interface voiceConfig {
  enabled: boolean;
}

interface bridgeConfig {
  url: string;
}

interface Config {
  title: string;

  client: Client;

  tts: boolean;
  stt: boolean;
  voice: boolean;
  
  bridge: Bridge;

  models: Model[];
  backgrounds: backgroundPackConfig;
}

let config: Config;

export const loadConfig = async (): Promise<Config | undefined> => {
  try {
    const resp = await fetch("/config.json");

    if (!resp.ok) {
      throw new Error(`failed to load config.json: ${resp.statusText}`);
    }

    const cfg : config = await resp.json();

    const bridgeUrl = cfg.bridge?.url ?? ""

    const client = new Client();
    const bridge = Bridge.create(bridgeUrl);

    config = {
      title : cfg.title,
      
      client: client,

      tts: cfg.tts?.enabled ?? false,
      stt: cfg.stt?.enabled ?? false,
      voice: cfg.voice?.enabled ?? false,
      
      bridge: bridge,

      models: cfg.models?.map((model) => {
        return {
          id: model.id,

          name: model.name,
          description: model.description,
        };
      }) ?? [],

      backgrounds: cfg.backgrounds ?? {},
    }

    return config;
  } catch (error) {
    console.error("unable to load config", error);
  }
};

export const getConfig = (): Config => {
  if (!config) {
    throw new Error("config not loaded");
  }

  return config;
};
