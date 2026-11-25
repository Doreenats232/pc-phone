import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mld.pcphone",
  appName: "PC Phone",
  webDir: "www",
  plugins: { CapacitorHttp: { enabled: true } },
  server: { androidScheme: "http", cleartext: true, allowNavigation: ["*"] },
};

export default config;
