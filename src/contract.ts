import { defineContract, get } from "@usevibejs/contract";
import * as v from "valibot";
import { DB_UNAVAILABLE } from "./errors.ts";

/** `GET /db/health` runs the driver's ping. */
export const dbHealth = defineContract("/db/health", {
  check: get("/", {
    response: v.object({ status: v.literal("ok") }),
    errors: { [DB_UNAVAILABLE]: 503 },
  }),
});
