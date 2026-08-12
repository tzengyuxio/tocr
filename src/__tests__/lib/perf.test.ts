/**
 * @jest-environment node
 */
describe("measure", () => {
  const originalEnv = process.env.PERF_LOG;
  let log: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    log = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    log.mockRestore();
    process.env.PERF_LOG = originalEnv;
  });

  async function loadMeasure() {
    return (await import("@/lib/perf")).measure;
  }

  it("stays silent unless PERF_LOG is on", async () => {
    process.env.PERF_LOG = undefined;
    const measure = await loadMeasure();

    await expect(measure("page", async () => "data")).resolves.toBe("data");
    expect(log).not.toHaveBeenCalled();
  });

  it("logs the label and a duration when enabled", async () => {
    process.env.PERF_LOG = "1";
    const measure = await loadMeasure();

    await expect(measure("admin/dashboard", async () => 42)).resolves.toBe(42);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^\[perf] admin\/dashboard \d+ms$/));
  });

  it("still logs when the load fails, and rethrows", async () => {
    process.env.PERF_LOG = "1";
    const measure = await loadMeasure();

    await expect(
      measure("admin/dashboard", async () => {
        throw new Error("db is down");
      })
    ).rejects.toThrow("db is down");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("[perf] admin/dashboard"));
  });
});
