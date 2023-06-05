/** Common methods to implement the {@link RangeType} interface
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

export { create, copy, setStart, setEnd };