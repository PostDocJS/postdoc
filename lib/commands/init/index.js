const {Command} = require('commander');

const {info, emphasize} = require('../../utils/logger.js');

exports.init = () =>
  new Command('init')
    .argument('<name>', 'A name of the project to generate')
    .description(
      'Generates a default project structure and necessary files to start with'
    )
    .action((name) => {
      info`
The project is generated. Navigate to it with:

	${emphasize('cd ' + name)}

After that you can run:

	${emphasize('postdoc run')}

to start development server.
			`;
    });
