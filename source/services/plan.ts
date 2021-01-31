import axios from "axios";
import { PlanRow } from "../types/plan";

export async function getPlan(): Promise<PlanRow[]> {
  const { data } = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values:batchGet?ranges=${process.env.SPREADSHEET_RANGE}&key=${process.env.SPREADSHEET_API_KEY}`
  );

  const plan = data.valueRanges[0].values.map(row => ({
    date: new Date(row[4]),
    book: row[3],
    chapter: row[2],
    comment: row[5]
  }));

  return plan;
}
