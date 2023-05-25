import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from "@rollup/plugin-terser";

export default [
	{
		input: "src/barrel.mjs",
		output: {
			file: "rangegroup.compat.min.js",
			name: "RangeGroup",
			format: "iife"
		},
		plugins: [
			babel({ babelHelpers: 'bundled' }),
			nodeResolve(),
			terser()
		]
	},
	{
		input: "src/barrel.mjs",
		output: {
			file: "rangegroup.min.js"
		},
		plugins: [ nodeResolve(), terser() ]
	}
];