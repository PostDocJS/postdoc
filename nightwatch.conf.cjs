//  _   _  _         _      _                     _          _
// | \ | |(_)       | |    | |                   | |        | |
// |  \| | _   __ _ | |__  | |_ __      __  __ _ | |_   ___ | |__
// | . ` || | / _` || '_ \ | __|\ \ /\ / / / _` || __| / __|| '_ \
// | |\  || || (_| || | | || |_  \ V  V / | (_| || |_ | (__ | | | |
// \_| \_/|_| \__, ||_| |_| \__|  \_/\_/   \__,_| \__| \___||_| |_|
//             __/ |
//            |___/
//

const path = require("path");

module.exports = {
  src_folders: ["test/src", "test/e2e"],
  globals_path: path.resolve(__dirname, "test", "lib", "globals.cjs"),

  webdriver: {
    start_process: true,
  },

  test_settings: {
    default: {
      launch_url: "http://localhost:5173",
      desiredCapabilities: {
        browserName: "chrome",
      },
      exclude: "test/src/**",
    },
    unittests: {
      unit_tests_mode: true,
      filter: "test/src/**",
      exclude: "",
    },
  },

  test_workers: {
    enabled: false,
  },
};
