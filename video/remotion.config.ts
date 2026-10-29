import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Remotion's own headless shell closed on start on the Mac this was made on ("Target closed"); the
// installed Google Chrome renders fine. Elsewhere Remotion's own browser is used.
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (existsSync(MAC_CHROME)) Config.setBrowserExecutable(MAC_CHROME);
