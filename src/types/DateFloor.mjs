import IntType from "./Int.mjs";
import DateFloorNormType from "./DateFloorNorm.mjs"


/** This is similar to {@link DateType}, but where fractions of a *time unit* are ignored. This
 * supports second, minute, hour, and day time units. Each of these is accessible as
 * `DateType.Second`, etc. As an example, `new Date("2023-06-08T01:33:59.380Z")`,
 * would be treated as the following for each time unit:
 * - **second**: 2023-06-08T01:33:59Z
 * - **minute**: 2023-06-08T01:33:00Z
 * - **hour**: 2023-06-08T01:00:00Z
 * - **day**: 2023-06-08T00:00:00Z
 * 
 * Note that the implicit conversion is done in UTC, using JavaScript's Date object. This means:
 * - Local timezone information is not factored into `DateType.Day`.
 * - Some unusual timezones have a daylight savings offset of 30 minutes, rather than a whole hour.
 *   `DateType.Hour` wouldn't account for this.
 * - Leap seconds are not factored into `DateType.minute`.
 * 
 * In all other cases, conversion is unaffected by locality.
 * 
 * The time unit defines the smallest interval between two dates. For example, if using
 * `DateType.Hour`, the following ranges could be merged via {@link RangeGroup#normalize}:
 * ```js
 * [new Date("09:30 1/15"), new Date("14:00 1/15")]
 * [new Date("15:59 1/15"), new Date("16:00 1/15")]
 * ```
 * 
  This uses {@link IntType} internally as a base type.
 * @implements {RangeType}
 */
const DateFloorType = {};

// Just replace the base_type
for (const unit in DateFloorNormType){
	const derived = Object.assign({}, DateFloorNormType[unit]);
	derived.base_type = IntType;
	DateFloorType[unit] = derived;
}

export default DateFloorType;