/** Common methods and helpers to implement the {@link RangeType} interface
 * @namespace CommonType
 */

/** Basic implementation of {@link RangeType.create}. This uses {@link RangeType.setStart} and
 * {@link RangeType.setEnd} to initialize the range.
 * @memberof CommonType
 * @param {any} start starting bound
 * @param {any} end ending bound
 * @param {?boolean} startExcl whether starting bound is exclusive
 * @param {?boolean} endExcl whether ending bound is exclusive
 * @returns {Range}
 */
function create(start, end, startExcl, endExcl){
	const r = {};
	// initialize?
	if (arguments.length){
		this.setStart(r, start, startExcl);
		this.setEnd(r, end, endExcl);
	}
	return r;
}
/** Basic implementation of {@link RangeType.copy}. This uses `Object.assign` to copy the object
 * @memberof CommonType
 */
function copy(range){
	return Object.assign({}, range);
}
/** Basic implementation of {@link RangeType.setStart}. This deletes {@link Range#startExcl}, rather
 * than set it to `false`
 * @memberof CommonType
 */
function setStart(range, start, startExcl){
	range.start = start;
	if (startExcl)
		range.startExcl = startExcl;
	else delete range.startExcl;
	return range;
}
/** Basic implementation of {@link RangeType.setEnd}. This deletes {@link Range#endExcl}, rather
 * than set it to `false`
 * @memberof CommonType
 */
function setEnd(range, end, endExcl){
	range.end = end;
	if (endExcl)
		range.endExcl = endExcl;
	else delete range.endExcl;
	return range;
}

/** Simple decorator that adds fuzzy comparison to an existing {@link RangeType}. This causes ranges
 * to be merged if their endpoints are within `epsilon` distance. It can be especially useful if
 * using {@link RealType} or {@link FloatNormType}, where imprecision in floating point
 * arithmetic can mean adjacent ranges don't quite line up.
 * @memberof CommonType
 * @param {number} epsilon the absolute threshold at which {@link RangeType~CompareResult}
 *  `distance` is clamped to zero
 * @param {RangeType} type the type whose {@link RangeType.compare} method should be wrapped
 * @param {boolean} extend if true, a new {@link RangeType} is created that extends `type`; if
 *  false, the {@link RangeType.compare} method of `type` is simply overwritten
 * @returns {RangeType} depending on the value of `extend`, either `type` or a new type that
 *  inherits from `type`
 */
function compareEpsilon(epsilon, type, extend=false){
	const compare = type.compare;
	const wrapper = function(...args){
		const out = compare(...args)
		if (Math.abs(out.distance) <= epsilon)
			out.distance = 0;
		return out;
	};
	if (extend)
		type = Object.create(type);
	type.compare = wrapper;
	return type;
}

export { create, copy, setStart, setEnd, compareEpsilon };