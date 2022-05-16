const {Command} = require('commander');

const {info} = require('../../utils/logger.js');

exports.init = () =>
  new Command('init')
    .argument('<name>', 'A name of the project to generate')
    .description(
      'Generates a default project structure and necessary files to start with'
    )
    .action((name) => {
      info`
The project is generated. Navigate to it with:

	${'cd ' + name}

After that you can run:

	postdoc run

to start development server.
			`;
    });
