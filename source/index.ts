import dotenv from "dotenv";
import mongoose from "mongoose";
import schedule from "node-schedule";
import Telegraf from "telegraf";
import { DEFAUL_TRANSLATION, TRANSLATIONS } from "./constants";
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

  context.reply(
    "Welcome to Bible reading bot\nYou can set up preferred translation using /translation"
  );
});

mongoose.connection.once("connected", () => {
  console.log("Successfully connected to mongodb");

  app.launch();

  app.command("translation", context =>
    context.reply("Choose translation", {
      reply_markup: {
        inline_keyboard: Object.keys(TRANSLATIONS).map(translation => [
          {
            text: TRANSLATIONS[translation].name,
            callback_data: `updateTranslation/${translation}`
          }
        ])
      }
    })
  );

  app.on("callback_query", async context => {
    const [action, ...params] = context.update.callback_query.data.split("/");
    const chatId = context.update.callback_query.from.id;

    switch (action) {
      case "updateTranslation":
        if (params[0] && TRANSLATIONS[params[0]]) {
          let chat = await Chat.findOne({ id: chatId }).exec();
          chat.translation = params[0];
          await chat.save();

          return context.reply(`Your translations is now "${TRANSLATIONS[params[0]].name}"`);
        }
      default:
        return context.reply("Something went wrong. Try again later");
    }
  });

  schedule.scheduleJob("* 5 * * *", async () => {
    const plan = await getPlan();
    const todaysChapter = plan.find(day => isToday(day.date));

    const chats = await Chat.find().exec();

    chats.forEach(chat => {
      const translationCode = TRANSLATIONS[chat.translation]
        ? TRANSLATIONS[chat.translation].code
        : TRANSLATIONS[DEFAUL_TRANSLATION].code;

      app.telegram.sendMessage(
        chat.id,
        `https://www.bible.com/ru/bible/${translationCode}/${todaysChapter.book}.${todaysChapter.chapter}`
      );
    });
  });
});
