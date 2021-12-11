export const createCommonOtpFn = async (
  data: any,
  type: any,
  platform?: string,
  service?: string
) => {
  console.log("createCommonOtpFn");
  console.log("data");
  console.log(data);
  // data can be either 'email' OR 'mobile'
  try {
    if (!isDef(data)) {
      throw Boom.badRequest("Email or mobile no is required");
    }
    console.log({
      otpData: data,
    });
    if (!isDef(type) || isEmpty(type)) {
      throw Boom.badRequest("Data type is required");
    }

    let otpQuery: any = {};

    if (isDef(service) && !isEmpty(service)) {
      otpQuery = {
        ...otpQuery,
        service,
      };
    }

    if (type == "mobile") {
      if (!data.pnf || !data.regionCode) {
        throw Boom.badRequest("Mobile data invalid");
      }
      if (platform == "bd") {
        let bdmanagerQuery = {
          mobile: data.mobile,
          regionCode: data.regionCode,
        };
        console.log("bdmanagerQuery");
        console.log(bdmanagerQuery);
        let bdmanager = await BDManager.findOne(bdmanagerQuery);
        console.log("bdmanager");
        console.log(bdmanager);
        if (!isDef(bdmanager)) {
          throw Boom.badRequest("No Manager registered with this mobile");
        }
      }

      console.log("mob", data.mobile);
      // Valid Phone Number
      otpQuery = {
        ...otpQuery,
        // mobile: data.pnf,
        mobile: data.mobile,
        regionCode: data.regionCode,
        platform: platform,
      };
    } else if (type == "email" && isvalidEmail(data.email)) {
      // Valid Email
      otpQuery = {
        ...otpQuery,
        email: data.email,
      };
    }

    let resetOtp = await Otp.findOne({
      ...otpQuery,
    }).lean();

    let otp = 888888;
    if (config.dynamicOTP) {
      otp = random(111111, 999999);
    }
    if (isDef(otpQuery.mobile) && otpQuery.mobile == 919999999999) {
      otp = 999999;
    }

    if (isDef(resetOtp)) {
      const a = moment(new Date((Otp as any).updatedAt));
      const b = moment(new Date());

      let timeDifference = b.diff(a, "milliseconds");
      console.log({
        timeDifference,
        "config.otpPersistance": parseInt(config.otpPersistance),
      });
      if (timeDifference < parseInt(config.otpPersistance)) {
        return resetOtp;
      }
    }

    resetOtp = await Otp.findOneAndUpdate(
      {
        ...otpQuery,
      },
      {
        ...otpQuery,
        otp,
      },
      {
        upsert: true,
        new: true,
      }
    ).lean();

    return resetOtp;
  } catch (error: any) {
    throw Boom.boomify(error);
  }
};

export const verifyCommonOtpFn = async (
  data: any,
  otp: number,
  type: string
) => {
  try {
    console.log(otp);
    if (!isDef(data)) {
      throw Boom.badRequest("MOBILE or EMAIL is required");
    }

    if (!isDef(otp)) {
      throw Boom.badRequest("OTP required");
    }
    let otpObj;
    if (type == "mobile") {
      let otpData: any = await Otp.findOne({
        mobile: data,
        otp: otp,
      }).lean();
      otpObj = otpData;
      console.log({
        userOtp11: otpObj,
      });
    }
    if (type == "email") {
      let otpData: any = await Otp.findOne({
        email: data,
        otp: otp,
      }).lean();
      otpObj = otpData;
      console.log({
        userOtp11: otpObj,
      });
    }

    if (!otpObj) {
      throw Boom.badRequest("OTP not found");
    }
    let newDate: any = new Date();
    if (newDate - (otpObj as any).updatedAt > config.otpPersistance) {
      throw Boom.badRequest("OTP is not valid");
    }
    console.log({
      otp,
      "otpObj.otp": otpObj.otp,
    });

    if (otp == otpObj.otp) {
      console.log("OTP Valid");
      await Otp.remove({
        mobile: data,
      });
      let responseObject;
      if (isDef(otpObj) && isDef(otpObj.mobile)) {
        responseObject = getFormattedMobile(otpObj.mobile, otpObj.regionCode);
      } else if (isDef(otpObj) && isDef(otpObj.email)) {
        responseObject = {
          email: otpObj.email,
        };
      } else throw Boom.badRequest("Something went wrong");

      let mobileObj = getFormattedMobile(otpObj.mobile, otpObj.regionCode);

      return {
        status: true,
        mobileObj,
        otpObj,
      };
    } else {
      console.log("OTP Invalid");
      throw Boom.badRequest("OTP is not valid");
    }
  } catch (error: any) {
    throw Boom.boomify(error);
  }
};

////////////////////
/////MODEL
///////////////////
import { Schema, Types, Document, Model, model } from "mongoose";
const { ObjectId } = Types;

interface IOtp extends Document {
  platform: string;
  hospital: string;
  user: string;
  otp: number;
  email: string;
  mobile: number;
  regionCode: string;
}

const OTPSchema = new Schema(
  {
    platform: {
      type: String,
    },
    expireAt: {
      type: Date,
      default: Date.now,
      index: { expires: "5m" },
    },
    hospital: {
      type: ObjectId,
      ref: "Hospital",
      index: true,
    },
    user: {
      type: ObjectId,
      ref: "User",
      index: true,
      unique: true,
      sparse: true,
    },
    otp: {
      type: Number,
      index: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    mobile: {
      type: Number,
      unique: true,
      sparse: true,
      index: true,
    },
    regionCode: {
      type: String,
    },
  },
  { timestamps: true }
);

const Otp: Model<IOtp> = model("Otp", OTPSchema);

export { Otp };
