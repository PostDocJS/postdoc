module.exports = {
  'src_folders': ['test/pages'],
  'page_objects_path': 'test/pages',
  'plugins': [
    'nightwatch-plugin-postdoc'
  ],
  'webdriver': {
    'start_process': true,
    'server_path': '',
    'cli_args': []
  },
  'test_settings': {
    'default': {
      'launch_url': 'http://localhost:5173',
      'desiredCapabilities': {
        'browserName': 'chrome'
      }
    },
    'chrome': {
      'desiredCapabilities': {
        'browserName': 'chrome'
      }
    },
    'firefox': {
      'desiredCapabilities': {
        'browserName': 'firefox'
      }
    },
    'edge': {
      'desiredCapabilities': {
        'browserName': 'MicrosoftEdge'
      }
    },
    'safari': {
      'desiredCapabilities': {
        'browserName': 'safari'
      }
    }
  }
};
