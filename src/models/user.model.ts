import mongoose, { Model, Schema } from "mongoose";
import bcrypt from "bcrypt";

import { IUser } from "../utils/types/user";

const userSchema: Schema<IUser> = new Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v: string) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
        message: (props: { value: string }) =>
          `${props.value} is not a valid email!`,
      },
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["AD", "MG", "SO", "GU"],
      required: true,
    },
    permissions: {
      type: String,
      required: true,
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    remarks: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);

userSchema.pre<IUser>("save", async function (next) {
  if (this.isModified("passwordHash")) {
    const saltRounds: number =
      parseInt(process.env.SALT_ROUNDS as string, 10) || 10;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
  }
  next();
});

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
