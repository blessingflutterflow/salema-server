import { Response } from "express";

import CustomRequest from "../utils/types/express";
import ServiceRequest from "../models/service-requests.model";
import User from "../models/user.model";
import Event from "../models/event.model";
import { CreateEventDto } from "../utils/types/event";
import { validationResult } from "express-validator";

const create = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { serviceRequestId } = req.params;

    const raisedBy = req.user?.id;

    const { eventTitle, eventBody }: CreateEventDto = req.body;

    const serviceRequest = await ServiceRequest.findById(serviceRequestId);

    if (!serviceRequest) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Service Request not found" });
    }

    const isAuthorized =
      raisedBy.toString() === serviceRequest.client.toString() ||
      serviceRequest.assignedOfficers?.some(
        (officer) => officer.toString() === raisedBy.toString()
      );

    if (!isAuthorized) {
      return res.status(404).json({
        status: "ERROR",
        message:
          "You are not authorized to add an event for this service request",
      });
    }

    const user = await User.findById(raisedBy);
    if (!user) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    const newEvent = new Event({
      eventTitle,
      eventBody,
      serviceRequest: serviceRequestId,
      raisedBy: raisedBy,
      comments: [],
    });

    await newEvent.save();

    serviceRequest.events.push(newEvent._id);

    await serviceRequest.save();

    return res.status(201).json({
      status: "OK",
      message: "Event created successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Error creating event",
    });
  }
};

const listMyEvents = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const raisedBy = req.user?.id;

    const events = await Event.find({ raisedBy }).populate({
      path: "comments.profile",
      select: "firstName surname lastName companyName",
      match: { isDeleted: false },
    });

    return res.status(200).json({
      status: "OK",
      events,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Error fetching events",
    });
  }
};

const listAllEvents = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const events = await Event.find()
      .select("eventTitle eventBody comments status")
      .populate({
        path: "comments.profile",
        select: "firstName surname lastName companyName",
        match: { isDeleted: false },
      });

    if (events.length === 0) {
      return res.status(200).json({
        status: "OK",
        events: [],
      });
    }

    return res.status(200).json({
      status: "OK",
      events,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Error fetching events",
    });
  }
};

const addComment = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { eventId } = req.params;
    const { comment } = req.body;
    const user = req.user?.id;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Comment content is required",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: "ERROR",
        message: "Event not found",
      });
    }

    const newComment = {
      comment,
      user,
      profile: req.user?.profile,
      role:
        req.user?.role === "GU"
          ? "Client"
          : req.user?.role === "MG"
          ? "SecurityCompany"
          : req.user?.role === "SO"
          ? "SecurityOfficer"
          : "Admin",
    };

    event.comments.push(newComment);

    await event.save();

    return res.status(200).json({
      status: "OK",
      message: "Comment added successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Error adding comment",
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

    const userId = req.user?.id;
    const commentId = req.body.commentId;
    const eventId = req.params.eventId;

    const event = await Event.findOne({
      _id: eventId,
      "comments._id": commentId,
    });

    if (!event) {
      return res.status(404).json({
        status: "ERROR",
        message: "Event or Comment not found",
      });
    }

    const commentIndex = event.comments.findIndex(
      (comment) => comment._id?.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        status: "ERROR",
        message: "Comment not found",
      });
    }

    if (event.comments[commentIndex].user?.toString() !== userId) {
      return res.status(403).json({
        status: "ERROR",
        message: "You don't have permission to delete this comment",
      });
    }

    event.comments[commentIndex].isDeleted = true;

    await event.save();

    return res.status(200).json({
      status: "OK",
      message: "Comment deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Error deleting the comment",
    });
  }
};

const listServiceRequestEvents = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const serviceRequest = req.params.serviceRequestId;

    const events = await Event.find({ serviceRequest })
      .select("eventTitle eventBody comments status")
      .populate({
        path: "comments.profile",
        select: "firstName surname lastName companyName",
        match: { isDeleted: false },
      });

    return res.status(200).json({
      status: "OK",
      events,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Error fetching events",
    });
  }
};

const updateEvent = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const eventId = req.params.eventId;

    const event = await Event.findByIdAndUpdate(eventId, {
      status: req.body.status,
    });

    if (!event) {
      return res.status(404).json({
        status: "ERROR",
        message: "Event not found",
      });
    }

    return res.status(200).json({
      status: "OK",
      message: "Event updated successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Error fetching events",
    });
  }
};

export default {
  create,
  listMyEvents,
  listServiceRequestEvents,
  listAllEvents,
  addComment,
  deleteComment,
  updateEvent,
};
