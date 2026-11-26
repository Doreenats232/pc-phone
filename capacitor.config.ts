import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mld.pcphone",
  appName: "PC Phone",
  webDir: "www",
  android: { appendUserAgent: `PCPhoneApp/${process.env.PC_BUILD ?? "0"}` },
  server: { androidScheme: "http", cleartext: true, allowNavigation: ["*"] },
};

export default config;
