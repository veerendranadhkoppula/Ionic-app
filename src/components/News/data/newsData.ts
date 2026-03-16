import one from "./1.png";
import two from "./2.png";

export interface NewsItem {
  id: string;
  title: string;
  tagline: string;
  minutesToRead: string;
  date: string;
  image: string;
  content: string;
}

export const newsData: NewsItem[] = [
  {
    id: "1",
    title: "From Farm to Cup",
    tagline:
      "Inside our sourcing journey and the farmers behind every bean.",
    minutesToRead: "10 min read",
    date: "30 Jan, 2026",
    image: one,
    content: `
      Roasting is where coffee truly comes alive.
      Every batch is carefully developed.
      Balance and sweetness are key.
    `,
  },
  {
    id: "2",
    title: "The Art of Brewing",
    tagline:
      "Explore the craft techniques that elevate your daily coffee ritual.",
    minutesToRead: "8 min read",
    date: "28 Jan, 2026",
    image: two,
    content: `
      Brewing coffee is science and art.
      Temperature and grind matter.
      Precision creates perfection.
    `,
  },
];