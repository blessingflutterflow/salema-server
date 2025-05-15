import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";

import { RegisterClientDto, UpdateClientDto } from "../utils/types/client";
import {
  AddMissingPersonDto,
  UpdateMissingPersonDto,
} from "../utils/types/missing-person";
import { AddUpdateCommentDto } from "../utils/types/comment";
import Client from "../models/client.model";
import User from "../models/user.model";
import MissingPerson from "../models/missing-person.model";
import Comment from "../models/comment.model";
import CustomRequest from "../utils/types/express";
import { renameFile } from "../utils/helpers/multer";

const register = async (req: Request, res: Response): Promise<any> => {
  let newClient: any = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }
    const {
      firstName,
      surname,
      address,
      contact,
      password,
      email,
    }: RegisterClientDto = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        status: "ERROR",
        message: "User already exists with this email",
      });
    }

    newClient = new Client({
      firstName,
      surname,
      address,
      contact,
    });

    await newClient.save();

    const userData = {
      userName: `${firstName} ${surname}`,
      userId:
        firstName.toLowerCase().slice(0, 4) +
        Math.floor(1000 + Math.random() * 9000),
      email,
      passwordHash: password,
      role: "GU",
      permissions: "02",
      profile: newClient._id,
      isActive: true,
      remarks: "",
      isDeleted: false,
    };

    const newUser = new User(userData);

    const jwtSecret = process.env.JWT_SECRET ?? "JWT_SECRET";
    const access_token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        permission: newUser.permissions,
      },
      jwtSecret,
      {
        expiresIn: "24h",
      }
    );

    await newUser.save();

    res.status(201).json({
      status: "OK",
      message: "Client registered successfully",
      access_token,
    });
  } catch (error: any) {
    console.error("Error during registration:", error);

    if (newClient) {
      await Client.deleteOne({ _id: newClient._id });
    }

    res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const myProfile = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const profileId = req.user?.profile;

    const client = await Client.findById(profileId)
      .populate({
        path: "securityCompaniesUsed",
        model: "SecurityCompany",
        select:
          "-officers -verificationStatus -isDeleted -createdAt -updatedAt -verifiedAt -verifiedBy",
      })
      .select("-createdAt -updatedAt -isDeleted");

    if (!client || client.isDeleted) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Client not found" });
    }

    return res.status(200).json({ status: "OK", client });
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

    const { firstName, surname, contact, address }: UpdateClientDto = req.body;

    const updatedClient = await Client.findByIdAndUpdate(
      req.user?.profile,
      { firstName, surname, contact, address },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Client profile updated successfully" });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const updateClientProfile = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { id } = req.params;
    const { firstName, surname, contact, address }: UpdateClientDto = req.body;

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { firstName, surname, contact, address },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Client updated successfully" });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const deleteClient = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { id: clientId } = req.params;

    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      { isDeleted: true },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Client not found" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { profile: clientId },
      { isDeleted: true },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      await Client.findByIdAndUpdate(clientId, { isDeleted: false });
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Deleted successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: "Server error" });
  }
};

const addMissingPerson = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = req.user?.id;
    const {
      personName,
      age,
      lastSeenDateTime,
      lastSeenLocation,
      contact,
    }: AddMissingPersonDto = req.body;

    const newFileName = await renameFile(personName, req.file);

    const missingPerson = new MissingPerson({
      client,
      filepath: newFileName,
      personName,
      age,
      lastSeenDateTime,
      lastSeenLocation,
      contact,
      isDeleted: false,
      comments: [],
      missingStatus: "missing",
    });

    await missingPerson.save();

    return res.status(201).json({
      status: "OK",
      message: "Missing person details added successfully.",
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const getMissingPerson = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: missingPersonId } = req.params;

    const missingPerson = await MissingPerson.findById(
      missingPersonId
    ).populate({
      path: "comments",
      model: "Comment",
      match: { isDeleted: false },
    });

    if (missingPerson && missingPerson.filepath) {
      missingPerson.filepath = `${req.protocol}://${req.get("host")}/uploads/${
        missingPerson.filepath
      }`;
    }

    return res.status(200).json({ status: "OK", missingPerson });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const listMissingPersons = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const missingPersons = await MissingPerson.find({
      isDeleted: false,
    }).select("-client -isDeleted -createdAt -updatedAt -comments");

    const formattedMissingPersons = missingPersons.map((person) => {
      return {
        ...person.toObject(),
        filePath: `${req.protocol}://${req.get("host")}/uploads/${
          person.filepath
        }`,
      };
    });

    return res
      .status(200)
      .json({ status: "OK", missingPersons: formattedMissingPersons });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const updateMissingPerson = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const {
      lastSeenDateTime,
      lastSeenLocation,
      missingStatus,
    }: UpdateMissingPersonDto = req.body;

    const updatedMissingPerson = await MissingPerson.findByIdAndUpdate(
      req.params.id,
      { lastSeenDateTime, lastSeenLocation, missingStatus },
      { new: true, runValidators: true }
    );

    if (
      !updatedMissingPerson ||
      !updatedMissingPerson.client.equals(req.user?.id)
    ) {
      return res
        .status(404)
        .json({ message: "Missing person details not found." });
    }

    return res.status(200).json({
      status: "OK",
      message: "Missing person details updated successfully.",
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const deleteMissingPerson = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { id: missingPersonId } = req.params;

    const updatedMissingPerson = await MissingPerson.findByIdAndUpdate(
      missingPersonId,
      { isDeleted: true, missingStatus: "found" },
      { new: true, runValidators: true }
    );

    if (
      !updatedMissingPerson ||
      !updatedMissingPerson.client.equals(req.user?.id)
    ) {
      return res.status(404).json({
        status: "ERROR",
        message: "Missing person details not found.",
      });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const addComment = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = req.user?.id;
    const { body, missingPerson }: AddUpdateCommentDto = req.body;

    let comment = new Comment({
      client,
      body,
      missingPerson,
      isDeleted: false,
    });

    await MissingPerson.findByIdAndUpdate(
      missingPerson,
      { $addToSet: { comments: comment?._id } },
      { new: true }
    );

    await comment?.save();

    return res.status(201).json({
      status: "OK",
      message: "Comment added successfully.",
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const updateComment = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { body }: AddUpdateCommentDto = req.body;

    let updateComment = await Comment.findByIdAndUpdate(
      req.params.id,
      { body },
      { new: true, runValidators: true }
    );

    if (!updateComment || !updateComment.client.equals(req.user?.id)) {
      return res.status(404).json({ message: "Comment not found." });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Comment updated successfully." });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const deleteComment = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    let updateComment = await Comment.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true, runValidators: true }
    );

    if (!updateComment || !updateComment.client.equals(req.user?.id)) {
      return res.status(404).json({ message: "Comment not found." });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const listAll = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const clients = await Client.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .select("-updatedAt -isDeleted")
      .populate({
        path: "emergencyContacts",
        model: "EmergencyContact",
        select: "-updatedAt -createdAt -isDeleted -client",
      })
      .populate({
        path: "securityCompaniesUsed",
        model: "SecurityCompany",
        select:
          "-createdAt -updatedAt -verificationStatus -isDeleted -verifiedBy -verifiedAt -officers",
      });

    return res.status(200).json({ status: "OK", clients });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "An error occurred while fetching clients",
    });
  }
};

export default {
  register,
  myProfile,
  updateProfile,
  deleteClient,
  addMissingPerson,
  getMissingPerson,
  listMissingPersons,
  updateMissingPerson,
  deleteMissingPerson,
  addComment,
  updateComment,
  deleteComment,
  listAll,
  updateClientProfile,
};
