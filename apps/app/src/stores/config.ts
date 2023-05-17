import { atomWithStorage } from "./utils/storage";

const configKey = "config";

export const config = atomWithStorage(configKey, {});
