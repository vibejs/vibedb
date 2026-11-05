import { expect, it } from "vitest";
import { pgliteDriver } from "./pglite.ts";

it("opens an owned client and skips migration when no folder is configured", async () => {
  const opened = await pgliteDriver().open({});
  await opened.migrate();
  await opened.ping();
  await opened.close();
  await expect(opened.ping()).rejects.toThrow(Error);
});
