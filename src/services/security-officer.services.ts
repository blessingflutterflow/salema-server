import { Response } from "express";
import CustomRequest from "../utils/types/express";
import SecurityOfficer from "../models/security-officer.model";
import { UpdateOfficerDto } from "../utils/types/security-officer";
import { validationResult } from "express-validator";

const myProfile = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const profileId = req.user?.profile;

    const securityOfficer = await SecurityOfficer.findById(profileId).select(
      "-createdAt -updatedAt -isDeleted -assignedCompany -assignedBy"
    );

    if (!securityOfficer) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Cannot find officer profile" });
    }

    return res.status(200).json({ status: "OK", profile: securityOfficer });
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
      availabilityStatus,
      skills,
      experienceYears,
    }: UpdateOfficerDto = req.body;
    const profileId = req.user?.profile;

    const securityOfficer = await SecurityOfficer.findById(profileId);

    if (!securityOfficer) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Cannot find officer profile" });
    }

    const updatedValues = {
      firstName,
      lastName,
      psiraNumber,
      phone,
      availabilityStatus,
      skills,
      experienceYears,
    };

    Object.assign(securityOfficer, updatedValues);
    await securityOfficer.save();

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
