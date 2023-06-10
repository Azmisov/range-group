import IntType from "./Int.mjs";
import DateNormType from "./DateNorm.mjs";

/** Implementation of {@link RangeType} for JavaScript Date objects. Internally, this type is
 * represented as an {@link IntType} operating on the Date's numeric millisecond value (the Unix
 * timestamp). Hence, the following ranges would get merged by {@link RangeGroup#normalize}:
 * ```js
 * [new Date(0), new Date(10)]
 * [new Date(11), new Date(20)]
 * ```
 * 
 * The {@link RangeType.size} method will give you the duration of the range in milliseconds. * 
 * @implements {RangeType}
 */
const DateType = Object.assign({}, DateNormType);
DateType.base_type = IntType;
export default DateType;