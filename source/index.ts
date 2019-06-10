import Telegraf from "telegraf";
import schedule from "node-schedule";
import mongoose from "mongoose";
import dotenv from "dotenv";
import "./models";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });

const Chat = mongoose.model("Chat");

const app = new Telegraf(process.env.BOT_TOKEN);

app.start(async context => {
  let chat = await Chat.findOne({ id: context.chat.id }).exec();

  if (!chat) {
    chat = new Chat({
      id: context.chat.id,
      type: context.chat.type,
      firstName: context.chat.first_name,
      lastName: context.chat.last_name,
      userName: context.chat.username,
      title: context.chat.title
    });

    await chat.save();
  }

  context.reply("Welcome");
});

mongoose.connection.once("connected", () => {
  console.log("Successfully connected to mongodb");

  app.launch();

  schedule.scheduleJob("5 * * * * *", async () => {
    const chats = await Chat.find().exec();

    chats.forEach(chat => {
      app.telegram.sendMessage(chat.id, "hi");
    });
  });
});
