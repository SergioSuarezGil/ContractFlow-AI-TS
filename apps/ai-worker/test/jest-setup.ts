jest.mock("@nestjs/common", () => ({
  Injectable: () => (target: unknown) => target,
  Logger: class {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_context?: string) {}
    log(): void {}
    warn(): void {}
    error(): void {}
    debug(): void {}
  },
}));
