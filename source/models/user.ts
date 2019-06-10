import mongoose from "mongoose";

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
  title: String
});
