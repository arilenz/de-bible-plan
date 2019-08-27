import mongoose from "mongoose";
import { DEFAUL_TRANSLATION } from "../constants";

mongoose.model("Chat", {
  id: {
    type: Number,
    required: true,
    index: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ["private", "group", "supergroup", "channel"]
  },
  firstName: String,
  lastName: String,
  userName: String,
  title: String,
  translation: {
    type: String,
    default: DEFAUL_TRANSLATION,
    required: true
  }
});
