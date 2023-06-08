import IntNormType from "./IntNorm.mjs";
import DateType from "./Date.mjs";

/** This is the same as {@link DateType}, but where the range bounds have been normalized to always
 * be inclusive. This can be easier to work with, and omits the extra logic needed to handle
 * exclusive bounds.
 * 
 * This uses {@link IntNormType} as its base type.
 * @implements {RangeType}
 */
const DateNormType = Object.assign({}, DateType);
DateNormType.base_type = IntNormType;
export default DateNormType;