import IntNormType from "./IntNorm.mjs";
import { create, copy } from "./helpers/common.mjs";

const abstract_type = {
	base_type: IntNormType,
	// conversion to base_type
	toBaseType(val){
		return Math.floor(val/this.unit)
	},
	toBaseTypeRange(range){
		return {
			start: this.toBaseType(range.start),
			end: this.toBaseType(range.end),
			startExcl: range.startExcl,
			endExcl: range.endExcl
		};
	},
	create,
	setStart(range, start, startExcl){
		this.base_type.setStart(range, this.toBaseType(start), startExcl);
		range.start = new Date(range.start*this.unit);
		return range;
	},
	setEnd(range, end, endExcl){
		this.base_type.setEnd(range, this.toBaseType(end), endExcl);
		range.end = new Date(range.end*this.unit);
		return range;
	},
	copy(range){
		const out = copy(range);
		out.start = new Date(out.start);
		out.end = new Date(out.end);
		return out;
	},
	size(range){
		return this.base_type.size(this.toBaseTypeRange(range));
	},
	compare(mode, a, b, aExcl, bExcl){
		return this.base_type.compare(mode, this.toBaseType(a), this.toBaseType(b), aExcl, bExcl);
	},
	*iterate(range, ...args){
		const gen = this.base_type.iterate(this.toBaseTypeRange(range), ...args);
		for (const val of gen)
			yield new Date(val*this.unit);
	}
};

/** This is the same as {@link DateFloorType}, but where the range bounds have been normalized to
 * always be inclusive. This can be easier to work with, and omits the extra logic needed to handle
 * exclusive bounds.
 * 
 * This uses {@link IntNormType} internally as a base type.
 * @implements {RangeType}
 */
const DateFloorNormType = {};

const units = {};
units.Second = 1000;
units.Minute = 60*units.Second;
// in rare cases, daylight savings can offset by 20mins; otherwise, its always multiples of hour 
units.Hour = 60*units.Minute;
// would need to compensate for local time here
units.Day = 24*units.Hour;

for (const name in units){
	const derived = Object.assign({}, abstract_type);
	derived.unit = units[name];
	DateFloorNormType[name] = derived;
}

export default DateFloorNormType;