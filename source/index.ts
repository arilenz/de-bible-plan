import dotenv from "dotenv";
import mongoose from "mongoose";
import schedule from "node-schedule";
import Telegraf from "telegraf";
import { DEFAUL_TRANSLATION, TRANSLATIONS } from "./constants";
import "./models";
import { getPlan } from "./services/plan";
import { isToday } from "./utils/compareDates";
import express from "express";
import bodyParser from "body-parser";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });

const Chat = mongoose.model("Chat");

const app = new Telegraf(process.env.BOT_TOKEN);

app.start(async (context) => {
  let chat = await Chat.findOne({ id: context.chat.id }).exec();

  if (!chat) {
    chat = new Chat({
      id: context.chat.id,
      type: context.chat.type,
      firstName: context.chat.first_name,
      lastName: context.chat.last_name,
      userName: context.chat.username,
      title: context.chat.title,
    });

    await chat.save();
  }

  context.reply(
    `Ласкаво просимо до бота читтання Біблії за планом церкви Дім Євангелія

Кожного дня о 8й ранку бот надсилатиме Вам текст із Біблії (в перекладі Івана Огієнка)

Ви можете обрати інший переклад за допомогою команди /translation

Enjoy  🎉`
  );
});

mongoose.connection.once("connected", () => {
  console.log("Successfully connected to mongodb");

  app.launch();

  app.command("translation", (context) =>
    context.reply("Оберіть переклад", {
      reply_markup: {
        inline_keyboard: Object.keys(TRANSLATIONS).map((translation) => [
          {
            text: TRANSLATIONS[translation].name,
            callback_data: `updateTranslation/${translation}`,
          },
        ]),
      },
    })
  );

  app.on("callback_query", async (context) => {
    const [action, ...params] = context.update.callback_query.data.split("/");
    const chatId = context.update.callback_query.from.id;

    switch (action) {
      case "updateTranslation":
        if (params[0] && TRANSLATIONS[params[0]]) {
          let chat = await Chat.findOne({ id: chatId }).exec();
          chat.translation = params[0];
          await chat.save();

          return context.reply(
            `Переклад змінено на "${TRANSLATIONS[params[0]].name}"`
          );
        }
      default:
        return context.reply("Щось пішно не так, спробуйте ще раз пізніше");
    }
  });

  schedule.scheduleJob("0 3 * * *", async () => {
    const plan = await getPlan();
    const todaysChapter = plan.find((day) => isToday(day.date));

    if (!todaysChapter || !todaysChapter.book || !todaysChapter.chapter)
      return null;

    const chats = await Chat.find().exec();

    chats.forEach((chat) => {
      const translationCode = TRANSLATIONS[chat.translation]
        ? TRANSLATIONS[chat.translation].code
        : TRANSLATIONS[DEFAUL_TRANSLATION].code;

      const chapters = todaysChapter.chapter.split("-");

      chapters.forEach((chapter) => {
        app.telegram.sendMessage(
          chat.id,
          `${
            todaysChapter.comment ? todaysChapter.comment + "\n\n" : ""
          }https://www.bible.com/ru/bible/${translationCode}/${
            todaysChapter.book
          }.${chapter}`
        );
      });
    });
  });
});

const expressApp = express();
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(bodyParser.json());

expressApp.post("/sendMessage", async (req, res) => {
  try {
    const message = req.body.message;

    const chats = await Chat.find().exec();

    for (let index = 0; index < chats.length; index++) {
      const chat = chats[index];
      await app.telegram.sendMessage(chat.id, message);
    }

    res.send("Sent");
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});
const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
