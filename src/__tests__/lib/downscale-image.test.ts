import { fitWithin, downscaleImage } from "@/lib/downscale-image";
import { MAX_UPLOAD_BYTES, resolvePolicy } from "@/lib/image-policy";

describe("MAX_UPLOAD_BYTES", () => {
  it("stays under the request body Vercel will accept", () => {
    // The platform rejects a larger body before the route runs, so the client
    // limit has to be the smaller of the two.
    expect(MAX_UPLOAD_BYTES).toBeLessThanOrEqual(4_500_000);
  });
});

describe("fitWithin", () => {
  it("scales the longest edge down to the limit", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("leaves images smaller than the limit alone", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("never rounds an edge down to zero", () => {
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe("downscaleImage", () => {
  it("passes animated GIFs through, as the server does", async () => {
    const file = new File([new Uint8Array(8)], "spin.gif", { type: "image/gif" });

    await expect(downscaleImage(file, "magazines")).resolves.toBe(file);
  });

  it("re-encodes to the same format the server would store", async () => {
    // The client encodes ahead of the server so the two cannot drift apart.
    expect(resolvePolicy("magazines").format).toBe("webp");
    expect(resolvePolicy("issues/toc").format).toBe("jpeg");
  });
});
