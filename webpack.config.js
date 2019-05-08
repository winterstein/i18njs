const webpack = require('webpack');
const path = require('path');


const baseConfig = {
	entry: ['@babel/polyfill', './src/i18n.js'],
	output: {
		path: path.resolve(__dirname, './bin'),
		// filename: is left undefined and filled in by makeConfig
	},
	devtool: 'source-map',
	resolve: {
		extensions: ['.js'],
		symlinks: false
	},
	module: {
		rules: [
			// {
			// 	test: /.jsx?$/,
			// 	loader: 'babel-loader',
			// 	exclude: /node_modules/,
			// 	options: {
			// 		presets: [
			// 			['@babel/preset-env', { targets: { ie: "11" }, loose: true }]
			// 		],
			// 		plugins: [
			// 			'@babel/plugin-proposal-class-properties',
			// 			'transform-node-env-inline'
			// 		]
			// 	}
			// }
		],
	},
};


/*
* Copy and fill out the baseConfig object with
* @param filename {!String} Set the bundle output.filename
* 
* ## process.env 
* process is always globally available to runtime code.
*/
const makeConfig = ({ filename, mode }) => {
	// config.mode can be "development" or "production" & dictates whether JS is minified
	const config = Object.assign({}, baseConfig, { mode });
	
	// What filename should we render to?
	config.output = Object.assign({}, config.output, { filename });

	/**
	 * process.env is available globally within bundle.js & allows us to hardcode different behaviour for dev & production builds
	 * NB Plain strings here will be output as token names and cause a compile error, so use JSON.stringify to turn eg "production" into "\"production\""
	 */
	config.plugins = [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(mode), // Used by bundle.js to conditionally set up logging & Redux dev tools
			}
		}),
	];
	return config;
};

// Output bundle files for production and dev/debug
module.exports = [
	makeConfig({filename: 'i18n.js', mode: 'production' }),
	makeConfig({filename: 'i18n-debug.js', mode: 'development' }),
];
