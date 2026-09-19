import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    ...(cfg.currentUserName !== undefined
      ? { current_user_name: cfg.currentUserName }
      : {}),
  };

  fs.writeFileSync(
    getConfigFilePath(),
    JSON.stringify(rawConfig, null, 2),
    "utf-8"
  );
}

function validateConfig(rawConfig: any): Config {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    throw new Error("Invalid config");
  }

  if (typeof rawConfig.db_url !== "string") {
    throw new Error("Invalid config: db_url");
  }

  if (
    rawConfig.current_user_name !== undefined &&
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error("Invalid config: current_user_name");
  }

  return {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
  };
}

export function readConfig(): Config {
  const contents = fs.readFileSync(getConfigFilePath(), "utf-8");
  return validateConfig(JSON.parse(contents));
}

export function setUser(cfg: Config, userName: string): void {
  cfg.currentUserName = userName;
  writeConfig(cfg);
}
