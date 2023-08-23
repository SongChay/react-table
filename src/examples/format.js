import _ from "underscore";

const Long = require("long");
const ECI_MASK = 0xfffffff;
const E_NODE_B_SHIFT = 8;
const NODEB_MASK = 0xfffff00; // 0 to 1048575
const NODEB_MASK_POS = 8;
const SECTOR_MASK = 0x00000000000000ff; // 0 to 255
const PLMN_SHIFT = 28;
const PLMN_MASK = 0xfffff;
const ECI_DIVISOR = Math.pow(10, 9);

const CoordinateFunc = (val, id, format) => {
  if (!val.length) return "N/A";
  if (!format.length)
    return val
      .map(v => {
        return general(v, id, format);
      })
      .reverse()
      .join(",");

  return val
    .map(v => {
      return toFixFloatVal(v, format, ".");
    })
    .reverse()
    .join(",");
};

const EnumDataFunc = (val, id, enumDef) => {
  return enumDef && enumDef[val] ? enumDef[val].name : general(val, id, "");
};

const IntegerDataFunc = (val, id, format) => {
  if (format.length) return val.padStart(format.length, "0");
  return general(val, id, format);
};

const UnsignedIntegerDataFunc = (val, id, format) => {
  if (format.length) return val.padStart(format.length, "0");
  return general(val, id, format);
};

const ImeiDataFunc = (val, id, format) => {
  if (format.length) {
    let array = format.split("-");
    let offset = 0;
    let res = "";
    array.map(v => {
      res += `${val.substr(offset, v.length)}-`;
      offset += v.length;
    });
    return res.substring(0, res.length - 1);
  }
  return general(val, id, format);
};

const toFixFloatVal = (val, format, separator) => {
  if (!_.isNumber(val)) return "NaN";
  let len = format.indexOf(separator);
  if (len === -1) return val.toFixed(0);
  return val.toFixed(format.length - len - 1);
};

const PercentDataFunc = (val, id, format) => {
  if (val === null) return general(val, id, format);
  return `${toFixFloatVal(val * 100.0, format, ".")}%`;
};

const MillisecondTimeDateDataFunc = (val, id, format) => {
  if (val === null) return general(val, id, format);
  const options = {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h12"
  };
  let date = new Date(val);
  return date.toLocaleDateString("en-US", options);
};

const MillisecondDurationDataFunc = (val, id, format) => {
  if (val === null) return general(val, id, format);
  //return `${val} ms`;
  let minStr = "";
  let hourStr = "";
  let sec = val / 1000;
  let fixLen = Number.isInteger(sec) ? 0 : 3;
  let secStr = `${(sec % 60)
    .toFixed(fixLen)
    .padStart(fixLen ? fixLen + 3 : 2, "0")}`;
  if (sec < 60) {
    //00:00.xxx   min:sec
    return `${minStr.padStart(2, "0")}:${secStr}`;
  }
  let min = sec / 60;
  minStr = (min % 60)
    .toFixed(1)
    .slice(0, -2)
    .padStart(2, "0");
  if (min > 60) {
    hourStr = (min / 60).toFixed(1).slice(0, -2);
    return `${hourStr}:${minStr}:${secStr}`;
  }
  return `${minStr}:${secStr}`;
};

const BoolDataFunc = (val, id, format) => {
  if (val === null) return general(val, id, format);
  return val ? "True" : "False";
};

const FloatDataFunc = (val, id, format) => {
  if (val === null || !format.length) return general(val, id, format);

  return toFixFloatVal(val, format, ".");
};

const GummeiDataFunc = (val, id, format) => {
  if (val === null) return general(val, id, format);
  let lVal = Long.fromString(val, true, 10);
  let hexStr = lVal.toString(16);
  let mcc = hexStr.slice(0, -9); //(val & 0xfff000000000)>>36;
  let mnc = hexStr.slice(-9, -6); //(val & 0xfff000000)>>24;
  let mmegi = parseInt(hexStr.slice(-6, -2), 16); //(val & 0xffff00)>>8;
  let mmec = `${parseInt(hexStr.slice(-2), 16)}`.padStart(3, "0");
  if (mnc[0] === "f") mnc = mnc.slice(1);
  return `${mcc}.${mnc}.${mmegi}.${mmec}`;
};

//waiting for gerrit response
const NEDataFunc = (val, id, isCellId, CellNameList) => {
  if (val === null) return general(val, id, "");
  let lVal = Long.fromString(val, true, 10);
  let plmn = lVal
    .shiftRight(PLMN_SHIFT)
    .and(PLMN_MASK)
    .toInt();
  let eci = lVal.and(ECI_MASK).toInt();
  return Long.fromInt(plmn, true)
    .multiply(ECI_DIVISOR)
    .add(eci)
    .toString(10);
};

const DistanceDataFunc = (val, id, format) => {
  if (val === null || !format.length) return general(val, id, "");
  return toFixFloatVal(val, format, ".");
};

const IntegerListDataFunc = (val, id, format) => {
  if (val === null) return general(val, id, "");
  return val.join(",");
};

const LteEnbIdDataFunc = (val, id, format) => {
  if (val === null) return general(val, id, "");
  let lVal = Long.fromString(val, true, 10);
  let eci = lVal.getLowBitsUnsigned() & ECI_MASK;
  /*if show in EnodeBName
  TODO:
     return  GetEnbNameIfAvailable(eci >> E_NODE_B_SHIFT)

  else
     show in QString("%1.%2")
  */
  let eNodeB = (eci & NODEB_MASK) >> NODEB_MASK_POS;
  let sector = eci & SECTOR_MASK;
  return `${eNodeB}.${sector}`;
};

const general = (val, id, format) => {
  if (val === null) return "N/A";
  return val;
};

const Handlers = {
  CoordinateFunc: CoordinateFunc,
  EnumDataFunc: EnumDataFunc,
  IntegerDataFunc: IntegerDataFunc,
  UnsignedIntegerDataFunc: UnsignedIntegerDataFunc,
  ImeiDataFunc: ImeiDataFunc,
  PercentDataFunc: PercentDataFunc,
  MillisecondTimeDateDataFunc: MillisecondTimeDateDataFunc,
  MillisecondDurationDataFunc: MillisecondDurationDataFunc,
  BoolDataFunc: BoolDataFunc,
  FloatDataFunc: FloatDataFunc,
  GummeiDataFunc: GummeiDataFunc,
  NEDataFunc: NEDataFunc,
  DistanceDataFunc: DistanceDataFunc,
  LteEnbIdDataFunc: LteEnbIdDataFunc,
  general: general
};

export default function getHandlerFuncs(type) {
  switch (type) {
    case "EndLatitudeData":
    case "EndLongitudeData":
      return Handlers.CoordinateFunc;
    case "PrimaryTerminatingNEData":
    case "PrimaryOriginatingNEData":
    case "LteNEData":
      return Handlers.NEDataFunc;
    case "LteStartEnbIdData":
    case "LteEndEnbIdData":
      return Handlers.LteEnbIdDataFunc;
    default:
      break;
  }
  return Handlers[`${type}Func`] ? Handlers[`${type}Func`] : Handlers.general;
}
