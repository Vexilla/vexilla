const fs = require('fs');
const path = require('path');

const formsDirPath = path.resolve(__dirname, '../');

const NODE_ENV = process.env.NODE_ENV;

if (NODE_ENV == 'development') {
	const envFilePath = path.resolve(formsDirPath, '.env');
	const envExamplePath = path.resolve(formsDirPath, '.env.example');
	const envFileExists = fs.existsSync(path.resolve(formsDirPath, '.env'));

	if (!envFileExists) {
		fs.copyFileSync(envExamplePath, envFilePath);
	}
}
