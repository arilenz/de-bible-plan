import dotenv from "dotenv";
import mongoose from "mongoose";
import schedule from "node-schedule";
import Telegraf from "telegraf";
import "./models";
import { getPlan } from "./services/plan";
import { isToday } from "./utils/compareDates";

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

  schedule.scheduleJob("8 * * * *", async () => {
    const plan = await getPlan();
    const todaysChapter = plan.find(day => isToday(day.date));

    const chats = await Chat.find().exec();

    chats.forEach(chat => {
      app.telegram.sendMessage(
        chat.id,
        `https://www.bible.com/ru/bible/400/${todaysChapter.book}.${todaysChapter.chapter}.SYNO`
      );
    });
  });
});
