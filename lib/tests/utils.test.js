const { setupAuth, getStackqlCommand } = require("../utils");
const childProcess = require("child_process");

jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

describe("util", () => {
  let core;
  let exec;
  const expectedAuth =
    '{ "google": { "type": "service_account",  "credentialsfilepath": "sa-key.json" }}';

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

  describe("setupAuth", () => {
    let AUTH_ENV = {
      AUTH_STR: expectedAuth,
      AUTH_FILE_PATH: "./lib/tests/test-auth.json",
    };

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...AUTH_ENV };
    });

    afterEach(() => {
      process.env = AUTH_ENV;
    });

    it("should throw error when neither AUTH_STR or AUTH_FILE_PATH is set", () => {
      process.env.AUTH_STR = undefined;
      process.env.AUTH_FILE_PATH = undefined;

      setupAuth(core);
      expect(core.setFailed).toBeCalledWith(
        "Either AUTH_FILE_PATH or AUTH_STR must be set."
      );
    });

    it("should set AUTH environment variable when AUTH_STR is set", () => {
      process.env.AUTH_FILE_PATH = undefined;

      setupAuth(core);

      expect(core.exportVariable).toBeCalledWith("AUTH", expectedAuth);
    });

    it("should set AUTH environment variable when AUTH_FILE_PATH is set", () => {
      process.env.AUTH_STR = undefined;

      setupAuth(core);

      expect(core.exportVariable).toBeCalledWith("AUTH", expectedAuth);
    });

    it("should throw error when AUTH_FILE_PATH is set but file does not exist", () => {
      process.env.AUTH_STR = undefined;
      process.env.AUTH_FILE_PATH = "./failed-test-auth.json";

      setupAuth(core);
      expect(core.setFailed).toBeCalledWith(
        `Cannot find auth file ${process.env.AUTH_FILE_PATH}`
      );
    });
  });

  describe("getStackqlCommand", () => {
    const EXECUTE_ENV = {
      QUERY: "test",
      QUERY_FILE_PATH: "test-query.json",
      AUTH: "test-auth",
    };

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...EXECUTE_ENV };
    });

    afterEach(() => {
      process.env = EXECUTE_ENV;
      jest.clearAllMocks();
    });

    it("should return error when there is neither query or query file path", async () => {
      process.env = { ...EXECUTE_ENV };
      process.env.QUERY = undefined;
      process.env.QUERY_FILE_PATH = undefined;

      await getStackqlCommand(core);

      expect(core.setFailed).toBeCalledWith(
        "Either query or query_file_path need to be set"
      );
    });

    it("should return error when there is no AUTH", async () => {
      process.env = { ...EXECUTE_ENV };
      process.env.AUTH = undefined;

      await getStackqlCommand(core);

      expect(core.setFailed).toHaveBeenCalledWith(
        "Cannot find AUTH environment variable when executing stackql"
      );
    });

    it("should execute stackql with query file path", async () => {
      process.env = { ...EXECUTE_ENV };
      process.env.QUERY = undefined;

      await getStackqlCommand(core);

      expect(childProcess.exec).toHaveBeenCalledWith(
        "stackql exec -i test-query.json --auth=test-auth --output=json"
      );
    });

    it("should execute stackql with query", async () => {
      process.env = { ...EXECUTE_ENV };
      process.env.QUERY_FILE_PATH = undefined;

      await getStackqlCommand(core);

      expect(childProcess.exec).toHaveBeenCalledWith(
        "stackql exec test --auth=test-auth --output=json"
      );
    });
  });
});
