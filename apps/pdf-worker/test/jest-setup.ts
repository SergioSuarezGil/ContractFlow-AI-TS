jest.mock("@nestjs/common", () => ({
  Injectable: () => (target: unknown) => target,
}));
