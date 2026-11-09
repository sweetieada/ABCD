import { restoreSourceState } from "./e2e-source-state.mjs";

export default async function globalTeardown() {
  await restoreSourceState();
}
