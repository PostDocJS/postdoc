//  _   _  _         _      _                     _          _
// | \ | |(_)       | |    | |                   | |        | |
// |  \| | _   __ _ | |__  | |_ __      __  __ _ | |_   ___ | |__
// | . ` || | / _` || '_ \ | __|\ \ /\ / / / _` || __| / __|| '_ \
// | |\  || || (_| || | | || |_  \ V  V / | (_| || |_ | (__ | | | |
// \_| \_/|_| \__, ||_| |_| \__|  \_/\_/   \__,_| \__| \___||_| |_|
//             __/ |
//            |___/
<<<<<<< HEAD
//

const path = require('path');

=======
const path = require("path");
>>>>>>> 003c5e1 (Add from-cli option to apidocs command.)
module.exports = {
  src_folders: ["test/src"],
  globals_path: path.resolve(__dirname, "test", "lib", "globals.cjs"),
  plugins: ["@nightwatch/apitesting"],
  start_session: false,
  webdriver: {
    start_process: false,
  },

  test_workers: {
    enabled: false,
  },

  "@nightwatch/apitesting": {
    log_responses: true,
  },
};
