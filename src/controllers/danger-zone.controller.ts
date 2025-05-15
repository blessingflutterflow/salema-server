import express from "express";
import { body, param } from "express-validator";

import dangerZoneServices from "../services/danger-zone.services";
import decodeToken from "../middlewares/decodeToken";
import authorizeAdmin from "../middlewares/authorizeAdmin";

const router = express.Router();

router.post(
  "/",

  body("name")
    .isString()
    .withMessage("Name must be a string.")
    .notEmpty()
    .withMessage("Name is required."),

  body("type")
    .isIn(["Polygon", "Circle"])
    .withMessage("Type must be either 'Polygon' or 'Circle'."),

  body("location")
    .if(body("type").equals("Polygon"))
    .notEmpty()
    .withMessage("Location is required for 'Polygon' type.")
    .custom((location) => {
      if (
        !location.coordinates ||
        !Array.isArray(location.coordinates) ||
        location.coordinates.length < 1
      ) {
        throw new Error("Location must be a non-empty array of coordinates.");
      }

      const innerCoordinates = location.coordinates[0];
      if (!Array.isArray(innerCoordinates) || innerCoordinates.length < 3) {
        throw new Error(
          "Location must contain at least three points to form a polygon."
        );
      }

      for (const coord of innerCoordinates) {
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new Error(
            "Each coordinate must be an array with two numeric values (longitude and latitude)."
          );
        }
        if (isNaN(coord[0]) || isNaN(coord[1])) {
          throw new Error("Coordinate values must be numeric.");
        }
        if (coord[0] < -180 || coord[0] > 180) {
          throw new Error("Longitude must be between -180 and 180.");
        }
        if (coord[1] < -90 || coord[1] > 90) {
          throw new Error("Latitude must be between -90 and 90.");
        }
      }

      return true;
    }),

  body("center")
    .if(body("type").equals("Circle"))
    .notEmpty()
    .withMessage("Center is required for 'Circle' type.")
    .custom((center) => {
      if (
        !Array.isArray(center.coordinates) ||
        center.coordinates.length !== 2
      ) {
        throw new Error(
          "Center must be an array with two numeric values (longitude and latitude)."
        );
      }
      if (isNaN(center.coordinates[0]) || isNaN(center.coordinates[1])) {
        throw new Error("Center coordinates must be numeric values.");
      }
      if (center.coordinates[0] < -180 || center.coordinates[0] > 180) {
        throw new Error("Longitude must be between -180 and 180.");
      }
      if (center.coordinates[1] < -90 || center.coordinates[1] > 90) {
        throw new Error("Latitude must be between -90 and 90.");
      }
      return true;
    }),

  body("radius")
    .if(body("type").equals("Circle"))
    .isNumeric()
    .withMessage("Radius must be a numeric value.")
    .notEmpty()
    .withMessage("Radius is required for 'Circle' type.")
    .isFloat({ min: 0, max: 5000 })
    .withMessage("Radius must be between 0 and 5000."),

  decodeToken,
  authorizeAdmin,
  dangerZoneServices.create
);

router.delete(
  "/:id",
  param("id")
    .exists()
    .withMessage("ID is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  decodeToken,
  authorizeAdmin,
  dangerZoneServices.remove
);

router.get("/", decodeToken, dangerZoneServices.list);

router.post(
  "/check",
  body("location")
    .exists()
    .withMessage("Location is required.")
    .isObject()
    .withMessage("Location must be an object.")
    .custom((value) => {
      if (
        typeof value.latitude !== "number" ||
        typeof value.longitude !== "number"
      ) {
        throw new Error("Latitude and Longitude must be numbers.");
      }
      return true;
    }),
  decodeToken,
  dangerZoneServices.check
);

export default router;
