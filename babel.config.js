module.exports = {
	presets: ['module:metro-react-native-babel-preset'],
	plugins: [
		[
			'module-resolver',
			{
				root: ['./'],
				alias: {
					'@': './src',
					'@components': './src/components',
					'@screens': './src/screens',
					'@services': './src/services',
					'@store': './src/store',
					'@types': './src/types',
					'@utils': './src/utils',
					'@hooks': './src/hooks',
					'@config': './src/config',
					'@navigation': './src/navigation',
					'@assets': './assets',
				},
				extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
			}
		]
	]
};
