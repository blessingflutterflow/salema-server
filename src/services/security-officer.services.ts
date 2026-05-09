import { Response } from "express";
import CustomRequest from "../utils/types/express";
import Guard from "../models/security-officer.model";
import { UpdateOfficerDto } from "../utils/types/security-officer";
import { validationResult } from "express-validator";

const myProfile = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const profileId = req.user?.profile;

    const guard = await Guard.findById(profileId).select(
      "-isDeleted -createdAt -updatedAt -fcmToken"
    );

    if (!guard) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Cannot find guard profile" });
    }

    return res.status(200).json({ status: "OK", profile: guard });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal Server Error" });
  }
};

const updateProfile = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      psiraNumber,
      phone,
      badgeNumber,
      grade,
      isArmed,
      vehicleType,
      isTacticalTrained,
    }: UpdateOfficerDto = req.body;
    const profileId = req.user?.profile;

    const guard = await Guard.findById(profileId);

    if (!guard) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Cannot find guard profile" });
    }

    const updatedValues: Partial<UpdateOfficerDto> = {};
    if (firstName) updatedValues.firstName = firstName;
    if (lastName) updatedValues.lastName = lastName;
    if (psiraNumber) updatedValues.psiraNumber = psiraNumber;
    if (phone) updatedValues.phone = phone;
    if (badgeNumber) updatedValues.badgeNumber = badgeNumber;
    if (grade) updatedValues.grade = grade;
    if (isArmed !== undefined) updatedValues.isArmed = isArmed;
    if (vehicleType) updatedValues.vehicleType = vehicleType;
    if (isTacticalTrained !== undefined) updatedValues.isTacticalTrained = isTacticalTrained;

    Object.assign(guard, updatedValues);
    await guard.save();

    return res
      .status(200)
      .json({ status: "OK", message: "Profile Updated Successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal Server Error" });
  }
};

export default {
  myProfile,
  updateProfile,
};
