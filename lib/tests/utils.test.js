const { getStackqlCommand, setOutput } = require("../utils");

describe("util", () => {
  let core;

  beforeEach(() => {
    core = {
      setFailed: jest.fn().mockImplementation((message) => {
        console.error(message);
      }),
      info: jest.fn().mockImplementation((message) => {
        console.log(message);
      }),
      exportVariable: jest.fn(),
      error: jest.fn().mockImplementation((message) => {
        console.error(message);
      }),
    };
  });

  describe("getStackqlCommand", () => {
    const EXECUTE_ENV = {
      QUERY: "test",
      QUERY_FILE_PATH: "test-query.json",
    };

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...EXECUTE_ENV };
    });

    afterEach(() => {
      process.env = EXECUTE_ENV;
      jest.clearAllMocks();
    });

    it("should return error when there is neither query or query file path", () => {
      process.env.QUERY = undefined;
      process.env.QUERY_FILE_PATH = undefined;

      getStackqlCommand(core);

      expect(core.setFailed).toBeCalledWith(
        "Either query or query_file_path need to be set"
      );
    });

    it("should execute stackql with query file path", () => {
      process.env.QUERY = undefined;

      getStackqlCommand(core);

      const receivedValue = core.exportVariable.mock.calls[0][1];
      expect(receivedValue).toContain("stackql exec -i test-query.json");
      expect(receivedValue).toContain("--output='json'");
      // Add further expectations here, such as vars and auth
    });

    it("should execute stackql with query", () => {
      process.env.QUERY_FILE_PATH = undefined;

      getStackqlCommand(core);

      const receivedValue = core.exportVariable.mock.calls[0][1];
      expect(receivedValue).toContain("stackql exec \"test\"");
      expect(receivedValue).toContain("--output='json'");
      // Add further expectations here, such as vars and auth
    });
  });
});
